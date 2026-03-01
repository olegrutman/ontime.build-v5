import { useMemo, useState } from 'react';
import { Package, Receipt, Percent } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SupplierEstimateItem } from '@/types/supplierEstimate';

interface EstimateSummaryCardProps {
  items: SupplierEstimateItem[];
  salesTaxPercent: number | null | undefined;
  estimateId: string;
  onTaxUpdate: (newPercent: number) => void;
}

interface PackSummary {
  name: string;
  itemCount: number;
  subtotal: number;
  percentOfTotal: number;
}

export function EstimateSummaryCard({ items, salesTaxPercent, estimateId, onTaxUpdate }: EstimateSummaryCardProps) {
  const [taxInput, setTaxInput] = useState<string>(String(salesTaxPercent ?? 0));
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const taxPercent = parseFloat(taxInput) || 0;

  const { subtotal, packs, totalItems } = useMemo(() => {
    let subtotal = 0;
    const packMap = new Map<string, { itemCount: number; subtotal: number }>();

    for (const item of items) {
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      subtotal += lineTotal;
      const packName = item.pack_name || 'Ungrouped';
      const existing = packMap.get(packName) || { itemCount: 0, subtotal: 0 };
      existing.itemCount += 1;
      existing.subtotal += lineTotal;
      packMap.set(packName, existing);
    }

    const packs: PackSummary[] = Array.from(packMap.entries()).map(([name, data]) => ({
      name,
      itemCount: data.itemCount,
      subtotal: data.subtotal,
      percentOfTotal: subtotal > 0 ? (data.subtotal / subtotal) * 100 : 0,
    }));

    return { subtotal, packs, totalItems: items.length };
  }, [items]);

  const taxAmount = subtotal * (taxPercent / 100);
  const grandTotal = subtotal + taxAmount;

  const handleTaxBlur = async () => {
    const newPercent = parseFloat(taxInput) || 0;
    if (newPercent === (salesTaxPercent ?? 0)) return;

    setSaving(true);
    const { error } = await supabase
      .from('supplier_estimates')
      .update({ sales_tax_percent: newPercent } as Record<string, unknown>)
      .eq('id', estimateId);

    if (error) {
      toast({ title: 'Error', description: 'Failed to save tax rate', variant: 'destructive' });
    } else {
      onTaxUpdate(newPercent);
    }
    setSaving(false);
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Financial Totals */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Receipt className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Estimate Summary</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal (before tax)</span>
            <span className="font-medium">${fmt(subtotal)}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Tax</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={taxInput}
                  onChange={(e) => setTaxInput(e.target.value)}
                  onBlur={handleTaxBlur}
                  onKeyDown={(e) => e.key === 'Enter' && handleTaxBlur()}
                  className="h-7 w-16 text-xs text-right"
                  disabled={saving}
                />
                <Percent className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            <span className="font-medium">${fmt(taxAmount)}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-sm font-semibold">
            <span>Total (incl. tax)</span>
            <span>${fmt(grandTotal)}</span>
          </div>
        </div>

        <Separator />

        {/* Overall Stats */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>{packs.length} pack{packs.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{totalItems} item{totalItems !== 1 ? 's' : ''} total</span>
        </div>

        {/* Pack Breakdown */}
        {packs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Pack Breakdown</span>
            </div>
            <div className="space-y-1.5">
              {packs.map((pack) => (
                <div key={pack.name} className="flex items-center justify-between text-sm rounded-md bg-muted/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{pack.name}</span>
                    <Badge variant="outline" className="text-[10px]">{pack.itemCount} items</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-muted-foreground text-xs">{pack.percentOfTotal.toFixed(1)}%</span>
                    <span className="font-medium">${fmt(pack.subtotal)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
