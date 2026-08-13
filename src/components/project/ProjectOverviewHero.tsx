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
    <div className="bg-[hsl(var(--foreground))] text-white rounded-2xl px-4 sm:px-5 py-4">
      {/* Utility row: back + eyebrow left, secondary utilities + bell right */}
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="md:hidden shrink-0 -ml-1 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-[18px] h-[18px]" />
          </button>
          <span className="font-mono text-[0.62rem] uppercase tracking-[0.25em] text-slate-400 leading-none truncate">
            Project Hub
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {metaSlot}
          {rightSlot}
        </div>
      </div>

      {/* Identity */}
      <h1 className="font-heading text-3xl sm:text-4xl font-bold uppercase tracking-tight leading-none break-words">
        {projectName}
      </h1>
      {address && <p className="text-[0.8rem] text-slate-400 mt-1 break-words">{address}</p>}

      {/* Single meta row — scrolls horizontally instead of wrapping */}
      <div className="flex items-center gap-2 mt-3.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
  );
}

