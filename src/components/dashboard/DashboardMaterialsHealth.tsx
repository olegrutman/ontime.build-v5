import { formatCurrency, cn } from '@/lib/utils';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';
import { StatusPill } from '@/components/ui/status-pill';

interface DashboardMaterialsHealthProps {
  estimate: number;
  ordered: number;
  forecast: number;
}

export function DashboardMaterialsHealth({ estimate, ordered, forecast }: DashboardMaterialsHealthProps) {
  const variance = estimate > 0 ? ((forecast - estimate) / estimate) * 100 : 0;
  const isOver = variance > 0;
  const healthLabel = variance > 5 ? 'Risk' : isOver ? 'Watch' : 'On Track';
  const healthVariant = variance > 5 ? 'at_risk' as const : isOver ? 'watch' as const : 'healthy' as const;

  const maxVal = Math.max(estimate, ordered, forecast, 1);
  const bars = [
    { label: 'Est', height: (estimate / maxVal) * 100, color: 'bg-slate-300 dark:bg-slate-600' },
    { label: 'Ord', height: (ordered / maxVal) * 100, color: 'bg-slate-400 dark:bg-slate-500' },
    { label: 'Fcst', height: (forecast / maxVal) * 100, color: isOver ? 'bg-amber-500' : 'bg-emerald-500' },
  ];

  return (
    <SurfaceCard>
      <SurfaceCardHeader
        title="Materials health"
        subtitle="Estimate vs ordered vs forecast"
        action={<StatusPill variant={healthVariant}>{healthLabel}</StatusPill>}
      />
      <SurfaceCardBody className="space-y-4">
        {/* Bar chart */}
        <div className="h-36 rounded-xl bg-slate-50 dark:bg-accent/20 border border-border/40 p-4 flex flex-col justify-end">
          <div className="flex items-end gap-4 h-full">
            {bars.map((bar) => (
              <div key={bar.label} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={cn('w-full rounded-t-lg transition-all duration-700', bar.color)}
                  style={{ height: `${Math.max(bar.height, 4)}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[0.7rem] text-muted-foreground mt-2">
            {bars.map((bar) => (
              <span key={bar.label} className="flex-1 text-center">{bar.label}</span>
            ))}
          </div>
        </div>

        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          {[
            { label: 'Estimate', value: estimate, highlight: false },
            { label: 'Ordered', value: ordered, highlight: false },
            { label: 'Forecast', value: forecast, highlight: isOver },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="rounded-xl bg-slate-50 dark:bg-accent/20 border border-border/40 p-3">
              <p className="text-muted-foreground text-[0.7rem]">{label}</p>
              <p className={cn('font-semibold mt-1 text-[0.85rem]', highlight && 'text-amber-700 dark:text-amber-400')} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
