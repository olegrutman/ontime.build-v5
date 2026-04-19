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
  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');

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
            <p className="text-[0.7rem] uppercase tracking-widest text-slate-500 font-medium mb-1">
              Project Overview
            </p>
            <h1 className="text-2xl font-semibold tracking-tight truncate">{projectName}</h1>
            {address && (
              <p className="text-[0.8rem] text-slate-400 mt-0.5 truncate">{address}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-[0.85rem] flex-wrap">
              <span className="text-slate-500">
                Status <span className="text-white font-medium">{statusLabel}</span>
              </span>
              {status === 'active' && health && (
                <span className="text-slate-500">
                  Health{' '}
                  <span
                    className={cn(
                      'font-medium',
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
              {projectType && (
                <span className="text-slate-500">
                  Type <span className="text-white font-medium">{projectType}</span>
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
