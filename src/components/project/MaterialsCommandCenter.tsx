import { formatCurrency, cn } from '@/lib/utils';
import { Package, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
  const forecast = estimate > 0 ? estimate + variance : ordered;

  return (
    <div className="rounded-3xl border border-border/60 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/40">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-xl font-semibold tracking-tight">Materials command center</h3>
            <p className="text-sm text-muted-foreground">The first place a material-responsible party should look</p>
          </div>
          <span className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            isOverBudget
              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
          )}>
            {isOverBudget ? `Trending ${Math.abs(variancePct)}% Over` : 'On Track'}
          </span>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* 6-col stat grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-sm">
          {[
            { label: 'Estimate', value: estimate },
            { label: 'Ordered', value: ordered },
            { label: 'Delivered', value: delivered },
            { label: 'Returns/Credits', value: 0 },
            { label: 'Forecast Final', value: forecast },
            { label: 'Variance', value: Math.abs(variance), prefix: isOverBudget ? '+' : '' },
          ].map(({ label, value, prefix }) => (
            <div key={label} className="rounded-2xl bg-accent/30 border border-border/40 p-4">
              <p className="text-muted-foreground text-xs">{label}</p>
              <p className="font-semibold mt-2 text-base" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {prefix}{formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>

        {/* 3-col alert tiles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AlertTile label="Packs not started" value={0} color="red" />
          <AlertTile label="Unmatched materials" value={0} color="amber" />
          <AlertTile label="Unconfirmed deliveries" value={pending > 0 ? 1 : 0} color="red" />
        </div>
      </div>
    </div>
  );
}

function AlertTile({ label, value, color }: { label: string; value: number; color: 'red' | 'amber' }) {
  const textColor = value > 0
    ? (color === 'red' ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400')
    : 'text-foreground';
  return (
    <div className="rounded-2xl bg-accent/30 border border-border/40 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-semibold mt-2', textColor)}>{value}</p>
    </div>
  );
}
