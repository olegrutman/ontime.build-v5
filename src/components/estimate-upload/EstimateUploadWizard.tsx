import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { parseEstimateCSV, ParsedPack, ParseResult } from '@/lib/parseEstimateCSV';
import { PackReviewStep } from './PackReviewStep';
import { PdfUploadStep } from './PdfUploadStep';
import { CatalogMatchStep, MatchedPack } from './CatalogMatchStep';
import { supabase } from '@/integrations/supabase/client';

type WizardStep = 'choose' | 'csv-upload' | 'pdf-upload' | 'review' | 'match';

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
  const [step, setStep] = useState<WizardStep>('choose');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [packs, setPacks] = useState<ParsedPack[]>([]);
  const [saving, setSaving] = useState(false);
  const [pdfWarnings, setPdfWarnings] = useState<string[]>([]);

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

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePdfParsed = (parsedPacks: ParsedPack[], warnings: string[]) => {
    setPacks(parsedPacks);
    setPdfWarnings(warnings);
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
          unit_price: 0,
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
    setStep('choose');
    setParseResult(null);
    setPacks([]);
    setPdfWarnings([]);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetWizard();
    onOpenChange(open);
  };

  const totalItems = packs.reduce((sum, p) => sum + p.items.length, 0);

  const stepTitle: Record<WizardStep, string> = {
    'choose': 'Upload Estimate',
    'csv-upload': 'Upload CSV',
    'pdf-upload': 'Upload PDF Quote',
    'review': 'Review Packs',
    'match': 'Catalog Matching',
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{stepTitle[step]}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* ── Step 1: Choose file type ─────────────────────────── */}
          {step === 'choose' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-8 px-4">
              <button
                className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                onClick={() => setStep('pdf-upload')}
              >
                <div className="p-3 rounded-full bg-primary/10">
                  <FileUp className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="font-medium text-sm">Upload PDF</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    AI extracts items automatically from supplier quotes
                  </p>
                </div>
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              </button>

              <button
                className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer"
                onClick={() => setStep('csv-upload')}
              >
                <div className="p-3 rounded-full bg-muted">
                  <FileText className="h-7 w-7 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-medium text-sm">Upload CSV</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Requires columns: pack_name, supplier_sku, description, qty, unit
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* ── CSV upload (legacy) ──────────────────────────────── */}
          {step === 'csv-upload' && (
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
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep('choose')}>Back</Button>
                <Button size="lg" onClick={() => fileInputRef.current?.click()}>
                  <FileText className="h-5 w-5 mr-2" />
                  Select CSV File
                </Button>
              </div>
            </div>
          )}

          {/* ── PDF upload (new AI-powered) ──────────────────────── */}
          {step === 'pdf-upload' && (
            <PdfUploadStep
              estimateId={estimateId}
              onParsed={handlePdfParsed}
              onCancel={() => setStep('choose')}
            />
          )}

          {/* ── Review packs ─────────────────────────────────────── */}
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

          {/* ── Catalog matching ─────────────────────────────────── */}
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
