import { formatCurrency, cn } from '@/lib/utils';

interface DashboardMaterialsHealthProps {
  estimate: number;
  ordered: number;
  forecast: number;
}

export function DashboardMaterialsHealth({ estimate, ordered, forecast }: DashboardMaterialsHealthProps) {
  const variance = estimate > 0 ? ((forecast - estimate) / estimate) * 100 : 0;
  const isOver = variance > 0;
  const healthLabel = variance > 5 ? 'Risk' : isOver ? 'Watch' : 'On Track';
  const healthColor = variance > 5
    ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
    : isOver
    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';

  // Simple bar chart data (mock monthly trend)
  const maxVal = Math.max(estimate, ordered, forecast, 1);
  const bars = [
    { label: 'Est', height: (estimate / maxVal) * 100, color: 'bg-slate-300 dark:bg-slate-600' },
    { label: 'Ord', height: (ordered / maxVal) * 100, color: 'bg-slate-400 dark:bg-slate-500' },
    { label: 'Fcst', height: (forecast / maxVal) * 100, color: isOver ? 'bg-amber-500' : 'bg-emerald-500' },
  ];

  return (
    <div className="rounded-3xl bg-card border border-border/60 shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Materials health</h3>
          <p className="text-sm text-muted-foreground">Estimate vs ordered vs forecast</p>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', healthColor)}>
          {healthLabel}
        </span>
      </div>

      {/* Bar chart */}
      <div className="mt-6 h-40 rounded-2xl bg-accent/30 border border-border/40 p-4 flex flex-col justify-end">
        <div className="flex items-end gap-4 h-full">
          {bars.map((bar) => (
            <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cn('w-full rounded-t-xl transition-all duration-700', bar.color)}
                style={{ height: `${Math.max(bar.height, 4)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          {bars.map((bar) => (
            <span key={bar.label} className="flex-1 text-center">{bar.label}</span>
          ))}
        </div>
      </div>

      {/* Mini stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded-2xl bg-accent/30 border border-border/40 p-3">
          <p className="text-muted-foreground text-xs">Estimate</p>
          <p className="font-semibold mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(estimate)}</p>
        </div>
        <div className="rounded-2xl bg-accent/30 border border-border/40 p-3">
          <p className="text-muted-foreground text-xs">Ordered</p>
          <p className="font-semibold mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(ordered)}</p>
        </div>
        <div className="rounded-2xl bg-accent/30 border border-border/40 p-3">
          <p className="text-muted-foreground text-xs">Forecast</p>
          <p className={cn('font-semibold mt-1', isOver && 'text-amber-700 dark:text-amber-400')} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(forecast)}</p>
        </div>
      </div>
    </div>
  );
}
