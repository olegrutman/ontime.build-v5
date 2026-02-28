import { Package, TrendingUp, TrendingDown } from 'lucide-react';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

function pct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

interface MaterialBudgetTileProps {
  financials: ProjectFinancials;
  projectId: string;
}

export function MaterialBudgetTile({ financials }: MaterialBudgetTileProps) {
  const {
    viewerRole, materialEstimate, materialDelivered, materialOrderedPending,
    isTCMaterialResponsible, isGCMaterialResponsible,
  } = financials;

  // Only visible to material-responsible party
  const isResponsible =
    (viewerRole === 'Trade Contractor' && isTCMaterialResponsible) ||
    (viewerRole === 'General Contractor' && isGCMaterialResponsible);

  if (!isResponsible || materialEstimate <= 0) return null;

  const remaining = materialEstimate - materialDelivered;
  const isOver = materialDelivered > materialEstimate;
  const diffDollar = Math.abs(remaining);
  const diffPct = (diffDollar / materialEstimate) * 100;

  // Projected impact: if we have pending orders, project total
  const totalCommitted = materialDelivered + materialOrderedPending;
  const projectedOver = totalCommitted > materialEstimate;
  const projectedDiff = totalCommitted - materialEstimate;
  const projectedPctDiff = (projectedDiff / materialEstimate) * 100;

  return (
    <div className="border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Package className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          Material Budget Control
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Material Estimate</span>
          <span className="text-sm font-semibold tabular-nums">{fmt(materialEstimate)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Delivered PO Total</span>
          <span className="text-sm font-semibold tabular-nums">{fmt(materialDelivered)}</span>
        </div>
        <div className="border-t pt-1.5 flex items-center justify-between">
          <span className="text-xs font-medium">Remaining Budget</span>
          <span className={`text-lg font-bold tabular-nums ${isOver ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {isOver ? `-${fmt(diffDollar)}` : fmt(remaining)}
          </span>
        </div>

        {/* Over/Under indicator */}
        <div className="flex items-center gap-1.5">
          {isOver ? (
            <TrendingUp className="h-3.5 w-3.5 text-red-500" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-green-500" />
          )}
          <span className={`text-xs font-medium ${isOver ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {isOver ? `Over Budget: ${fmt(diffDollar)} (${pct(diffPct)})` : `Under Budget: ${fmt(diffDollar)} remaining (${diffPct.toFixed(1)}%)`}
          </span>
        </div>

        {/* Ordered but not delivered */}
        {materialOrderedPending > 0 && (
          <div className="flex items-center justify-between pt-1 border-t">
            <span className="text-xs text-muted-foreground">Ordered, Not Delivered</span>
            <span className="text-xs font-semibold tabular-nums text-amber-600 dark:text-amber-400">{fmt(materialOrderedPending)}</span>
          </div>
        )}

        {/* Projected impact */}
        {materialOrderedPending > 0 && projectedOver && (
          <p className="text-[11px] text-red-600 dark:text-red-400 italic">
            At current pace, projected material overage: {fmt(projectedDiff)} ({pct(projectedPctDiff)})
          </p>
        )}
      </div>
    </div>
  );
}
