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
}

const HEALTH_LABELS: Record<string, string> = {
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At Risk',
};

export function ProjectOverviewHero({
  projectName,
  address,
  status,
  projectType,
  health,
  rightSlot,
}: ProjectOverviewHeroProps) {
  const navigate = useNavigate();
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  const typeLabel = projectType
    ? projectType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    : null;

  return (
    <div className="bg-[hsl(var(--foreground))] text-white rounded-2xl px-4 sm:px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 flex items-start gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="md:hidden mt-0.5 shrink-0 p-1 -ml-1 rounded-md hover:bg-white/10 transition-colors"
            aria-label="Back to dashboard"
          >
            <ChevronLeft className="w-5 h-5 text-slate-400" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[0.78rem] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">
              Project Overview
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">{projectName}</h1>
            {address && (
              <p className="text-[0.9rem] sm:text-[0.85rem] text-slate-300 mt-1 break-words">{address}</p>
            )}
            <div className="flex items-center gap-x-4 gap-y-1.5 mt-3 text-[0.92rem] sm:text-[0.9rem] flex-wrap">
              <span className="text-slate-400">
                Status <span className="text-white font-semibold">{statusLabel}</span>
              </span>
              {status === 'active' && health && (
                <span className="text-slate-400">
                  Health{' '}
                  <span
                    className={cn(
                      'font-semibold',
                      health === 'healthy'
                        ? 'text-emerald-400'
                        : health === 'watch'
                          ? 'text-amber-400'
                          : 'text-red-400',
                    )}
                  >
                    {HEALTH_LABELS[health]}
                  </span>
                </span>
              )}
              {typeLabel && (
                <span className="text-slate-400">
                  Type <span className="text-white font-semibold">{typeLabel}</span>
                </span>
              )}
            </div>
          </div>
        </div>
        {rightSlot && <div className="flex items-center gap-2 shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
}
