import { Activity, AlertTriangle, CheckCircle2, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioHealthHeroProps {
  statusCounts: {
    setup: number;
    active: number;
    on_hold: number;
    completed: number;
    archived: number;
  };
  attentionCount: number;
  orgName?: string;
}

export function PortfolioHealthHero({ statusCounts, attentionCount, orgName }: PortfolioHealthHeroProps) {
  const totalActive = statusCounts.active + statusCounts.setup;
  const hasRisk = attentionCount > 2;
  const hasWarning = attentionCount > 0 && !hasRisk;

  const healthLabel = hasRisk ? 'Needs Attention' : hasWarning ? 'Watch' : 'Healthy';
  const healthColor = hasRisk ? 'text-red-600 dark:text-red-400' : hasWarning ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
  const healthBg = hasRisk ? 'bg-red-50 dark:bg-red-950/30' : hasWarning ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30';
  const HealthIcon = hasRisk ? AlertTriangle : hasWarning ? Activity : CheckCircle2;

  return (
    <div className="rounded-xl bg-card border border-border/60 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
            Portfolio Overview
          </p>
          <h2 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight truncate">
            {orgName || 'Your Projects'}
          </h2>
        </div>
        <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0', healthBg, healthColor)}>
          <HealthIcon className="w-3.5 h-3.5" />
          {healthLabel}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-5 mt-4">
        <Stat icon={<Activity className="w-3.5 h-3.5 text-emerald-500" />} label="Active" value={statusCounts.active} />
        <Stat icon={<div className="w-2 h-2 rounded-full bg-violet-500" />} label="Setup" value={statusCounts.setup} />
        <Stat icon={<Pause className="w-3.5 h-3.5 text-amber-500" />} label="On Hold" value={statusCounts.on_hold} />
        <Stat icon={<CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />} label="Completed" value={statusCounts.completed} />
        {attentionCount > 0 && (
          <Stat icon={<AlertTriangle className="w-3.5 h-3.5 text-red-500" />} label="Action Items" value={attentionCount} highlight />
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean }) {
  if (value === 0 && !highlight) return null;
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <span className={cn('font-heading text-lg font-bold', highlight && 'text-red-600 dark:text-red-400')}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
