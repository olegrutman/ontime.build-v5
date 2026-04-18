import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DashboardHeroProps {
  firstName: string | null;
  orgName?: string | null;
  orgTypeLabel?: string | null;
  statusCounts: { setup: number; active: number; on_hold: number; completed: number; archived: number };
  attentionCount: number;
}

const ORG_TYPE_LABELS: Record<string, string> = {
  GC: 'General Contractor',
  TC: 'Trade Contractor',
  FC: 'Field Crew',
  SUPPLIER: 'Supplier',
};

export function DashboardHero({
  firstName,
  orgName,
  orgTypeLabel,
  statusCounts,
  attentionCount,
}: DashboardHeroProps) {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const name = firstName || 'there';
  const typeLabel = orgTypeLabel ? (ORG_TYPE_LABELS[orgTypeLabel] || orgTypeLabel) : null;

  return (
    <div className="bg-[hsl(var(--foreground))] text-white rounded-2xl px-4 sm:px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[0.7rem] uppercase tracking-widest text-slate-500 font-medium mb-1">Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-tight truncate">
            {greeting}, {name}
          </h1>
          {(orgName || typeLabel) && (
            <p className="text-[0.8rem] text-slate-400 mt-0.5 truncate">
              {[orgName, typeLabel].filter(Boolean).join(' · ')}
            </p>
          )}
          <div className="flex items-center gap-4 mt-2 text-[0.85rem] flex-wrap">
            <span className="text-slate-500">Active <span className="text-white font-medium">{statusCounts.active}</span></span>
            <span className="text-slate-500">Setup <span className="text-white font-medium">{statusCounts.setup}</span></span>
            <span className="text-slate-500">On Hold <span className="text-white font-medium">{statusCounts.on_hold}</span></span>
            <span className="text-slate-500">Needs Attention <span className={cn('font-medium', attentionCount > 0 ? 'text-amber-400' : 'text-emerald-400')}>{attentionCount}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
