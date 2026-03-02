import { useState } from 'react';
import { AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMaterialsBudgetHealth } from '@/hooks/useMaterialsBudgetHealth';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, ReferenceLine, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

function fmtPct(n: number, showSign = true) {
  const sign = showSign && n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

type StatusColor = 'green' | 'amber' | 'red';

function getStatusColor(forecastVariancePct: number): StatusColor {
  if (forecastVariancePct <= 0) return 'green';
  if (forecastVariancePct <= 5) return 'amber';
  return 'red';
}

function getStatusLabel(forecastVariancePct: number) {
  if (forecastVariancePct <= 0) return 'On Budget';
  if (forecastVariancePct <= 5) return 'Trending Over Budget';
  return 'Trending Over Budget';
}

const statusStyles: Record<StatusColor, string> = {
  green: 'text-green-700 dark:text-green-400',
  amber: 'text-amber-700 dark:text-amber-400',
  red: 'text-destructive',
};

const statusBg: Record<StatusColor, string> = {
  green: 'bg-green-50 dark:bg-green-950/30',
  amber: 'bg-amber-50 dark:bg-amber-950/30',
  red: 'bg-red-50 dark:bg-red-950/30',
};

const statusDot: Record<StatusColor, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-destructive',
};


interface Props {
  projectId: string;
}

export function MaterialsBudgetStatusCard({ projectId }: Props) {
  const data = useMaterialsBudgetHealth(projectId);
  const [open, setOpen] = useState(false);

  if (data.loading) {
    return <Skeleton className="h-52 rounded-2xl" />;
  }

  // Don't render if no estimate data at all
  if (data.estimateTotal === 0 && data.materialsOrdered === 0) return null;

  const color = getStatusColor(data.forecastVariancePct);
  const deliveredVariancePct = data.estimateTotal > 0 ? ((data.deliveredNet - data.estimateTotal) / data.estimateTotal) * 100 : 0;
  const forecastVariancePct = data.forecastVariancePct;

  return (
    <>
      {/* Collapsed Card */}
      <div
        onClick={() => setOpen(true)}
        className="bg-card rounded-2xl shadow-sm p-5 cursor-pointer hover:shadow-md transition-shadow"
      >
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-3">Materials Budget Status</h3>

        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
          <span className="text-muted-foreground">Budget (Estimate)</span>
          <span className="text-right font-semibold tabular-nums">{fmt(data.estimateTotal)}</span>

          <span className="text-muted-foreground">Materials Ordered</span>
          <span className="text-right tabular-nums">
            <span className="font-semibold">{fmt(data.materialsOrdered)}</span>
            {data.estimateTotal > 0 && (
              <span className={cn('ml-1 text-xs', data.orderedVariancePct > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                ({fmtPct(data.orderedVariancePct)})
              </span>
            )}
          </span>

          <span className="text-muted-foreground">Delivered (Net)</span>
          <span className="text-right tabular-nums">
            <span className="font-semibold">{fmt(data.deliveredNet)}</span>
            {data.estimateTotal > 0 && (
              <span className={cn('ml-1 text-xs', deliveredVariancePct > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                ({fmtPct(deliveredVariancePct)})
              </span>
            )}
          </span>

          <span className="text-muted-foreground">Projected Final Cost</span>
          <span className="text-right tabular-nums">
            <span className="font-semibold">{fmt(data.forecastFinal)}</span>
            {data.estimateTotal > 0 && (
              <span className={cn('ml-1 text-xs', forecastVariancePct > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                ({fmtPct(forecastVariancePct)})
              </span>
            )}
          </span>
        </div>

        {/* Status line */}
        <div className={cn('flex items-center gap-2 mt-3 text-xs font-semibold', statusStyles[color])}>
          <span className={cn('h-2 w-2 rounded-full', statusDot[color])} />
          {getStatusLabel(data.forecastVariancePct)}
        </div>

        {/* Sparkline */}
        {data.chartData.length > 1 && (
          <div className="mt-3 h-[60px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                <ReferenceLine y={data.estimateTotal} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 3" strokeWidth={1} />
                <Line type="monotone" dataKey="ordered" stroke="hsl(var(--primary))" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="delivered" stroke="hsl(142 71% 45%)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Expanded Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Materials Budget Status</DialogTitle>
          </DialogHeader>

          {/* Forecast Summary */}
          <div className={cn('rounded-xl p-4', statusBg[color])}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Projected Final</p>
                <p className="text-lg font-bold tabular-nums">{fmt(data.forecastFinal)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Over/Under $</p>
                <p className={cn('text-lg font-bold tabular-nums', data.forecastVariance > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                  {data.forecastVariance >= 0 ? '+' : ''}{fmt(data.forecastVariance)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Over/Under %</p>
                <p className={cn('text-lg font-bold tabular-nums', forecastVariancePct > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400')}>
                  {fmtPct(forecastVariancePct)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Confidence</p>
                <p className="text-lg font-bold capitalize">{data.forecastConfidence}</p>
              </div>
            </div>
          </div>


          {/* Top 5 Packs Over Budget */}
          <div>
            <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Top 5 Packs Over Budget</h4>
            {data.packsOverBudget.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All packs within budget</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                    <th className="text-left py-2 font-medium">Pack</th>
                    <th className="text-right py-2 font-medium">Budget</th>
                    <th className="text-right py-2 font-medium">Ordered</th>
                    <th className="text-right py-2 font-medium">Over/Under</th>
                  </tr>
                </thead>
                <tbody>
                  {data.packsOverBudget.map((pack, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-2 truncate max-w-[160px]">{pack.packName}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(pack.estimateTotal)}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(pack.orderedTotal)}</td>
                      <td className="py-2 text-right tabular-nums font-semibold text-destructive">+{fmt(pack.overBudget)} (+{pack.overBudgetPct.toFixed(0)}%)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Top 5 Materials Not in Estimate */}
          <div>
            <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Top 5 Materials Not in Estimate</h4>
            {data.unmatchedItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All items match the estimate</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wide border-b">
                    <th className="text-left py-2 font-medium">Item</th>
                    <th className="text-right py-2 font-medium">Ordered Cost</th>
                    <th className="text-right py-2 font-medium"># POs</th>
                    <th className="text-right py-2 font-medium">First Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {data.unmatchedItems.map((item, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-2 truncate max-w-[160px]">{item.description}</td>
                      <td className="py-2 text-right tabular-nums font-medium">{fmt(item.orderedCost)}</td>
                      <td className="py-2 text-right tabular-nums">{item.poCount}</td>
                      <td className="py-2 text-right text-muted-foreground text-xs">{item.firstSeen ? format(new Date(item.firstSeen), 'MMM d') : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Risk Factors */}
          <div>
            <h4 className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-2">Risk Factors</h4>
            <div className="space-y-2">
              {data.riskFactors.unpricedItems > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span><strong>{data.riskFactors.unpricedItems}</strong> unpriced items across <strong>{data.riskFactors.unpricedPOs}</strong> POs</span>
                </div>
              )}
              {data.riskFactors.packsNotStarted > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span><strong>{data.riskFactors.packsNotStarted}</strong> of {data.riskFactors.totalPacks} packs not started</span>
                </div>
              )}
              {data.riskFactors.biggestUpcomingPack && (
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Biggest upcoming: <strong>{data.riskFactors.biggestUpcomingPack.name}</strong> ({fmt(data.riskFactors.biggestUpcomingPack.amount)})</span>
                </div>
              )}
              {data.riskFactors.unpricedItems === 0 && data.riskFactors.packsNotStarted === 0 && !data.riskFactors.biggestUpcomingPack && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span>No outstanding risk factors</span>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
