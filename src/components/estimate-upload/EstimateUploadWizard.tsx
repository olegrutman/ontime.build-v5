import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { WizardProgress } from '@/components/ui/wizard-progress';
import { parseEstimateCSV, ParsedPack, ParseResult } from '@/lib/parseEstimateCSV';
import { PackReviewStep } from './PackReviewStep';
import { PdfUploadStep } from './PdfUploadStep';
import { CatalogMatchStep, MatchedPack } from './CatalogMatchStep';
import { supabase } from '@/integrations/supabase/client';

type WizardStep = 'upload' | 'review' | 'match';

interface EstimateUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estimateId: string;
  supplierId: string;
  projectName?: string;
  estimateName?: string;
  onComplete: () => void;
}

export function EstimateUploadWizard({
  open,
  onOpenChange,
  estimateId,
  supplierId,
  projectName,
  estimateName,
  onComplete,
}: EstimateUploadWizardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<WizardStep>('upload');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [packs, setPacks] = useState<ParsedPack[]>([]);
  const [saving, setSaving] = useState(false);
  const [estimateTotal, setEstimateTotal] = useState<number | null>(null);

  const handleCsvFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePdfParsed = (parsedPacks: ParsedPack[], warnings: string[], total?: number | null) => {
    setPacks(parsedPacks);
    if (total != null) setEstimateTotal(total);
    setParseResult({
      packs: parsedPacks,
      totalItems: parsedPacks.reduce((sum, p) => sum + p.items.length, 0),
      discardedRows: 0,
    });
    setStep('review');
  };

  const handleRemovePack = (packName: string) => {
    setPacks(prev => prev.filter(p => p.name !== packName));
  };

  const handleMatchConfirm = async (matchedPacks: MatchedPack[]) => {
    setSaving(true);

    try {
      const items = matchedPacks.flatMap((pack) =>
        pack.items.map((item) => ({
          estimate_id: estimateId,
          supplier_sku: item.supplier_sku,
          description: item.description,
          quantity: item.quantity,
          uom: item.uom,
          unit_price: item.unit_price || 0,
          pack_name: pack.name,
          catalog_item_id: item.catalog_item_id,
        }))
      );

      await supabase
        .from('supplier_estimate_items')
        .delete()
        .eq('estimate_id', estimateId);

      const { error } = await supabase
        .from('supplier_estimate_items')
        .insert(items);

      if (error) throw error;

      // Save estimate_total and auto-calculate tax percent
      if (estimateTotal != null && estimateTotal > 0) {
        const itemSubtotal = items.reduce((sum, i) => sum + (i.quantity * (i.unit_price || 0)), 0);
        const calculatedTaxPercent = itemSubtotal > 0
          ? Math.round(((estimateTotal - itemSubtotal) / itemSubtotal) * 10000) / 100
          : 0;
        await supabase
          .from('supplier_estimates')
          .update({
            total_amount: estimateTotal,
            sales_tax_percent: Math.max(0, calculatedTaxPercent),
          } as Record<string, unknown>)
          .eq('id', estimateId);
      }

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
    setEstimateTotal(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetWizard();
    onOpenChange(open);
  };

  const totalItems = packs.reduce((sum, p) => sum + p.items.length, 0);

  const wizardSteps = [
    { title: 'Upload Estimate', description: projectName || estimateName || 'Upload file' },
    { title: 'Review Packs', description: 'Verify parsed data' },
    { title: 'Catalog Matching', description: 'Match to catalog' },
  ];

  const stepIndex = step === 'upload' ? 1 : step === 'review' ? 2 : 3;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col">
        <WizardProgress currentStep={stepIndex} totalSteps={3} steps={wizardSteps} />

        <div className="flex-1 overflow-auto px-6 py-4">
          {/* ── Upload step (unified PDF + CSV) ───────────────── */}
          {step === 'upload' && (
            <div className="space-y-4">
              <PdfUploadStep
                estimateId={estimateId}
                onParsed={handlePdfParsed}
                onCancel={() => handleClose(false)}
              />
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="h-px w-12 bg-border" />
                or
                <span className="h-px w-12 bg-border" />
              </div>
              <div className="flex justify-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvFileSelect}
                  className="hidden"
                />
                <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <FileText className="h-4 w-4 mr-2" />
                  Upload CSV instead
                </Button>
              </div>
            </div>
          )}

          {/* ── Review packs ─────────────────────────────────── */}
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

          {/* ── Catalog matching ─────────────────────────────── */}
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
