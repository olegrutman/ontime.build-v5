import { cn } from '@/lib/utils';

interface ProjectDarkHeaderProps {
  name: string;
  address?: string | null;
  status: string;
  healthLabel?: 'healthy' | 'watch' | 'at_risk';
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  setup: 'Setup',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived',
};

const HEALTH_BADGE: Record<string, { label: string; cls: string }> = {
  healthy: { label: 'Healthy', cls: 'bg-emerald-500/20 text-emerald-300' },
  watch: { label: 'Watch', cls: 'bg-amber-500/20 text-amber-300' },
  at_risk: { label: 'At Risk', cls: 'bg-red-500/20 text-red-300' },
};

export function ProjectDarkHeader({ name, address, status, healthLabel }: ProjectDarkHeaderProps) {
  const health = healthLabel ? HEALTH_BADGE[healthLabel] : null;

  return (
    <div className="bg-[hsl(var(--foreground))] text-white rounded-3xl p-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight truncate">{name}</h1>
          {address && (
            <p className="text-sm text-slate-400 mt-1 truncate">{address}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {health && (
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', health.cls)}>
              {health.label}
            </span>
          )}
          <span className="rounded-full px-3 py-1 text-xs font-semibold bg-white/15 text-white">
            {STATUS_LABELS[status] || status}
          </span>
        </div>
      </div>
    </div>
  );
}
