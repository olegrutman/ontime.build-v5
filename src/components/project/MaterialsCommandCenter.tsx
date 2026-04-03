import { formatCurrency, cn } from '@/lib/utils';
import { Package, Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

interface MaterialsCommandCenterProps {
  financials: ProjectFinancials;
}

export function MaterialsCommandCenter({ financials }: MaterialsCommandCenterProps) {
  const estimate = financials.materialEstimateTotal || 0;
  const ordered = financials.materialOrdered;
  const delivered = financials.materialDelivered;
  const pending = financials.materialOrderedPending;

  const variance = estimate > 0 ? ordered - estimate : 0;
  const variancePct = estimate > 0 ? Math.round((variance / estimate) * 100) : 0;
  const isOverBudget = variance > 0;

  const orderedPct = estimate > 0 ? Math.min(Math.round((ordered / estimate) * 100), 100) : 0;
  const deliveredPct = estimate > 0 ? Math.min(Math.round((delivered / estimate) * 100), 100) : 0;

  return (
    <div className="rounded-xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Materials</h3>
        </div>
        <div className={cn(
          'flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full',
          isOverBudget
            ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
        )}>
          {isOverBudget ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
          {isOverBudget ? `${variancePct}% over` : 'On Track'}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MaterialStat label="Estimate" value={estimate} />
          <MaterialStat label="Ordered" value={ordered} highlight={isOverBudget} />
          <MaterialStat label="Delivered" value={delivered} />
          <MaterialStat label="Pending" value={pending} />
        </div>

        {/* Progress Bars */}
        <div className="space-y-2">
          <ProgressRow label="Ordered" pct={orderedPct} color={isOverBudget ? 'bg-amber-500' : 'bg-blue-500'} />
          <ProgressRow label="Delivered" pct={deliveredPct} color="bg-emerald-500" />
        </div>

        {/* Variance */}
        {estimate > 0 && (
          <div className={cn(
            'rounded-lg p-3 text-sm',
            isOverBudget ? 'bg-red-50 dark:bg-red-950/20' : 'bg-emerald-50 dark:bg-emerald-950/20'
          )}>
            <span className="text-muted-foreground">Variance: </span>
            <span className={cn('font-semibold', isOverBudget ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400')} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {isOverBudget ? '+' : ''}{formatCurrency(Math.abs(variance))}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MaterialStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className={cn('font-heading text-lg font-bold mt-0.5', highlight && 'text-amber-600 dark:text-amber-400')} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function ProgressRow({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 bg-accent rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-1000 ease-out', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
