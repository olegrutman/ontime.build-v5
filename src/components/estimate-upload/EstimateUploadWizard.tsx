import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { parseEstimateCSV, ParsedPack, ParseResult } from '@/lib/parseEstimateCSV';
import { PackReviewStep } from './PackReviewStep';
import { CatalogMatchStep, MatchedPack } from './CatalogMatchStep';
import { supabase } from '@/integrations/supabase/client';

type WizardStep = 'upload' | 'review' | 'match';

interface EstimateUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimateId: string;
  supplierId: string;
  onComplete: () => void;
}

export function EstimateUploadWizard({
  open,
  onOpenChange,
  estimateId,
  supplierId,
  onComplete,
}: EstimateUploadWizardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<WizardStep>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [packs, setPacks] = useState<ParsedPack[]>([]);
  const [saving, setSaving] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseEstimateCSV(text);

      if (result.packs.length === 0) {
        toast.error('No valid packs found in this file. Make sure it has a pack_name column.');
        return;
      }

      setParseResult(result);
      setPacks(result.packs);
      setStep('review');
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePack = (packName: string) => {
    setPacks(prev => prev.filter(p => p.name !== packName));
  };

  const handleMatchConfirm = async (matchedPacks: MatchedPack[]) => {
    setSaving(true);

    try {
      // Build items for insert (excluding pricing)
      const items = matchedPacks.flatMap((pack) =>
        pack.items.map((item) => ({
          estimate_id: estimateId,
          supplier_sku: item.supplier_sku,
          description: item.description,
          quantity: item.quantity,
          uom: item.uom,
          unit_price: 0,
          pack_name: pack.name,
          catalog_item_id: item.catalog_item_id,
        }))
      );

      // Clear existing items for this estimate first
      await supabase
        .from('supplier_estimate_items')
        .delete()
        .eq('estimate_id', estimateId);

      // Insert new items
      const { error } = await supabase
        .from('supplier_estimate_items')
        .insert(items);

      if (error) throw error;

      toast.success(`${items.length} items saved across ${matchedPacks.length} packs`);
      onComplete();
      onOpenChange(false);
      resetWizard();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save estimate items');
    } finally {
      setSaving(false);
    }
  };

  const resetWizard = () => {
    setStep('upload');
    setParseResult(null);
    setPacks([]);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetWizard();
    onOpenChange(open);
  };

  const totalItems = packs.reduce((sum, p) => sum + p.items.length, 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'upload' && 'Upload Estimate CSV'}
            {step === 'review' && 'Review Packs'}
            {step === 'match' && 'Catalog Matching'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="p-4 rounded-full bg-muted">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <h3 className="font-medium mb-1">Upload your quote CSV</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  File should have columns: pack_name, supplier_sku, description, quantity, unit.
                  Pricing data will be excluded.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button size="lg" onClick={() => fileInputRef.current?.click()}>
                <FileText className="h-5 w-5 mr-2" />
                Select CSV File
              </Button>
            </div>
          )}

          {step === 'review' && (
            <PackReviewStep
              packs={packs}
              totalItems={totalItems}
              discardedRows={parseResult?.discardedRows || 0}
              onConfirm={() => setStep('match')}
              onCancel={() => handleClose(false)}
              onRemovePack={handleRemovePack}
            />
          )}

          {step === 'match' && (
            <CatalogMatchStep
              packs={packs}
              supplierId={supplierId}
              onConfirm={handleMatchConfirm}
              onBack={() => setStep('review')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
