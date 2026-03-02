import { AlertTriangle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { SupplierMaterialsOverviewData } from '@/hooks/useSupplierMaterialsOverview';
import { cn } from '@/lib/utils';

function fmt(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 1, notation: 'compact' }).format(amount);
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

function pctLabel(value: number, base: number): string {
  if (base <= 0) return '';
  const pct = ((value - base) / base) * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SupplierMaterialsOverviewData;
}

export function MaterialsBudgetDrawer({ open, onOpenChange, data }: Props) {
  const {
    estimateTotal, materialsOrdered, deliveredNet, forecastFinal,
    forecastConfidence, packsOverBudget, unmatchedItems, riskFactors,
  } = data;

  const topPacks = packsOverBudget.slice(0, 5);
  const topUnmatched = unmatchedItems.slice(0, 5);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Materials Budget Details</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-4">
          {/* Section 1: Summary */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Summary</p>
            <div className="space-y-1.5">
              <Row label="Budget (Estimate)" value={fmt(estimateTotal)} />
              <Row label="Materials Ordered" value={fmt(materialsOrdered)} sub={pctLabel(materialsOrdered, estimateTotal)} over={materialsOrdered > estimateTotal} />
              <Row label="Materials Delivered (Net)" value={fmt(deliveredNet)} sub={pctLabel(deliveredNet, estimateTotal)} over={deliveredNet > estimateTotal} />
              <Row label="Projected Final Cost" value={fmt(forecastFinal)} sub={pctLabel(forecastFinal, estimateTotal)} over={forecastFinal > estimateTotal} />
            </div>
            <Badge variant="outline" className="text-xs mt-1">
              Forecast confidence: {forecastConfidence === 'low' ? 'Low' : forecastConfidence === 'medium' ? 'Medium' : 'High'}
            </Badge>
          </div>

          {/* Section 2: Top Packs Over Budget */}
          {topPacks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top Packs Over Budget</p>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Pack</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Budget</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Ordered</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Over/Under</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPacks.map(p => (
                      <tr key={p.packName} className="border-b last:border-0">
                        <td className="px-3 py-2 truncate max-w-[140px]">{p.packName}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(p.estimateTotal)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(p.orderedTotal)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-destructive font-medium">
                          +{fmt(p.overBudget)} (+{p.overBudgetPct.toFixed(0)}%)
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 3: Materials Not in Estimate */}
          {topUnmatched.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Materials Not in Estimate</p>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Cost</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground"># POs</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">First Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUnmatched.map(item => (
                      <tr key={item.description} className="border-b last:border-0">
                        <td className="px-3 py-2 truncate max-w-[160px]">{item.description}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(item.orderedCost)}</td>
                        <td className="px-3 py-2 text-right">{item.poCount}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {new Date(item.firstSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 4: Risk Factors */}
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Risk Factors</p>
            <div className="space-y-2">
              {riskFactors.unpricedItems > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Unpriced items pending: {riskFactors.unpricedItems} items across {riskFactors.unpricedPOs} POs</span>
                </div>
              )}
              {riskFactors.packsNotStarted > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Packs not started: {riskFactors.packsNotStarted} of {riskFactors.totalPacks}</span>
                </div>
              )}
              {riskFactors.biggestUpcomingPack && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <span className="text-sm">Biggest upcoming pack: {riskFactors.biggestUpcomingPack.name} ({fmt(riskFactors.biggestUpcomingPack.amount)})</span>
                </div>
              )}
              {riskFactors.unpricedItems === 0 && riskFactors.packsNotStarted === 0 && !riskFactors.biggestUpcomingPack && (
                <p className="text-sm text-muted-foreground">No active risk factors.</p>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value, sub, over }: { label: string; value: string; sub?: string; over?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold tabular-nums">{value}</span>
        {sub && (
          <span className={cn("text-xs font-medium", over ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
