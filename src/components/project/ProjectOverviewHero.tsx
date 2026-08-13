import { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ProjectOverviewHeroProps {
  projectName: string;
  address?: string | null;
  status: string;
  projectType?: string | null;
  health?: 'healthy' | 'watch' | 'at_risk' | null;
  rightSlot?: ReactNode;
  /** Secondary utilities (e.g. Re-run setup) rendered in the unified metadata strip. */
  metaSlot?: ReactNode;
}

const HEALTH_LABELS: Record<string, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At Risk',
};

const PILL = 'px-2 py-0.5 rounded-md text-[0.68rem] font-bold uppercase tracking-wider border';

export function ProjectOverviewHero({
  projectName,
  address,
  status,
  projectType,
  health,
  rightSlot,
  metaSlot,
}: ProjectOverviewHeroProps) {
  const navigate = useNavigate();
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  const typeLabel = projectType
    ? projectType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <div className="bg-[hsl(var(--foreground))] text-white rounded-2xl px-4 sm:px-5 pt-4 pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 flex items-start gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="md:hidden mt-1 shrink-0 p-1 -ml-1 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-slate-400 mb-1">
              Project Hub
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold uppercase tracking-tight leading-none break-words">
              {projectName}
            </h1>
            {address && (
              <p className="text-[0.8rem] text-slate-400 mt-1.5 break-words">{address}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 mt-3">
              <span
                className={cn(
                  PILL,
                  status === 'active'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-700/50 border-slate-600/50 text-slate-300',
                )}
              >
                {statusLabel}
              </span>
              {status === 'active' && health && (
                <span
                  className={cn(
                    PILL,
                    health === 'healthy'
                      ? 'bg-sky-500/15 border-sky-500/30 text-sky-300'
                      : health === 'watch'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                        : 'bg-red-500/15 border-red-500/30 text-red-300',
                  )}
                >
                  {HEALTH_LABELS[health]}
                </span>
              )}
              {typeLabel && (
                <span className={cn(PILL, 'bg-slate-700/50 border-slate-600/50 text-slate-300 font-medium')}>
                  {typeLabel}
                </span>
              )}
            </div>
          </div>
        </div>
        {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
      </div>

      {metaSlot && (
        <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-end gap-2">
          {metaSlot}
        </div>
      )}
    </div>
  );
}
