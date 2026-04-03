import { formatCurrency, cn } from '@/lib/utils';
import { Wrench, TrendingUp, TrendingDown } from 'lucide-react';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

interface COImpactCardProps {
  financials: ProjectFinancials;
}

export function COImpactCard({ financials }: COImpactCardProps) {
  const { approvedEstimateSum } = financials;
  
  // If no CO data, don't render
  if (!approvedEstimateSum || approvedEstimateSum === 0) return null;

  const isPositive = approvedEstimateSum > 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
        <Wrench className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Change Order Impact</h3>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            isPositive ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'
          )}>
            <TrendIcon className={cn('w-5 h-5', isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Approved CO Value</p>
            <p className={cn('font-heading text-xl font-bold', isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {isPositive ? '+' : ''}{formatCurrency(approvedEstimateSum)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
