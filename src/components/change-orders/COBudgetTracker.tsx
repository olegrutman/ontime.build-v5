import { DT } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface COBudgetTrackerProps {
  gcBudget: number | null;
  totalApprovedSpend: number;
  isGC: boolean;
}

function fmtCurrency(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function COBudgetTracker({ gcBudget, totalApprovedSpend, isGC }: COBudgetTrackerProps) {
  if (!isGC || !gcBudget || gcBudget <= 0) return null;

  const pct = (totalApprovedSpend / gcBudget) * 100;
  const remaining = gcBudget - totalApprovedSpend;

  const barColor = pct >= 95 ? 'bg-destructive' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-3.5 py-3 border-b border-border">
        <h3
          className="text-[0.7rem] uppercase tracking-[0.04em] font-semibold text-muted-foreground"
         
        >
          GC Budget
        </h3>
      </div>
      <div className="px-3.5 py-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Budget</span>
          <span className="font-mono font-semibold text-foreground">
            {fmtCurrency(gcBudget)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Spent</span>
          <span className="font-mono font-medium text-foreground">
            {fmtCurrency(totalApprovedSpend)}
          </span>
        </div>

        <div className="relative h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={cn('absolute inset-y-0 left-0 rounded-full transition-all', barColor)}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className={cn(
            'font-medium',
            pct >= 95 ? 'text-destructive' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600',
          )}>
            {pct.toFixed(0)}% used
          </span>
          <span className="text-muted-foreground">
            {remaining >= 0 ? `${fmtCurrency(remaining)} remaining` : `${fmtCurrency(Math.abs(remaining))} over`}
          </span>
        </div>
      </div>
    </div>
  );
}
