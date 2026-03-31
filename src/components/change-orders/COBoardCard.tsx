import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ChangeOrderWithMembers } from '@/hooks/useChangeOrders';
import type { COStatus } from '@/types/changeOrder';
import { CO_STATUS_LABELS } from '@/types/changeOrder';

interface COBoardCardProps {
  co: ChangeOrderWithMembers;
  isActive: boolean;
  onClick: (id: string) => void;
}

const PRICING_BADGE: Record<string, string> = {
  fixed: 'Fixed',
  tm: 'T&M',
  nte: 'NTE',
};

/** Left-edge stripe — pricing_type first (ISSUE 3), then reason */
function getStripeColor(co: ChangeOrderWithMembers): string {
  if (co.pricing_type === 'tm') return '#7C3AED';
  if (co.pricing_type === 'nte') return '#F5A623';
  if (co.reason === 'addition') return '#2563EB';
  if (co.reason === 'rework' || co.reason === 'design_change') return '#F5A623';
  if (co.reason === 'damaged_by_others') return '#DC2626';
  if (co.pricing_type === 'fixed') return '#059669';
  return '#6B7280';
}

/** Progress fraction — rejected maps to 0 (FIX 6) */
function getProgress(status: string): number {
  const map: Record<string, number> = {
    draft: 0.1, shared: 0.15, work_in_progress: 0.3,
    rejected: 0, closed_for_pricing: 0.5,
    submitted: 0.7, approved: 0.9, contracted: 1,
  };
  return map[status] ?? 0.1;
}

/** Status-mapped pulsing dot color (BUG 4) */
function getDotColor(status: string): string {
  switch (status) {
    case 'submitted': return 'bg-amber-500';
    case 'closed_for_pricing': return 'bg-yellow-500';
    case 'work_in_progress':
    case 'draft':
    case 'shared': return 'bg-blue-500';
    case 'approved': return 'bg-emerald-500';
    case 'rejected': return 'bg-destructive';
    case 'contracted': return 'bg-muted-foreground';
    default: return 'bg-primary';
  }
}

function fmtCurrency(value: number) {
  if (value === 0) return '$0';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const ROLE_COLORS: Record<string, string> = {
  GC: 'bg-blue-500',
  TC: 'bg-emerald-500',
  FC: 'bg-amber-500',
};

function getAssignedRole(createdByRole: string | null): string | null {
  if (createdByRole === 'GC') return 'TC';
  if (createdByRole === 'TC') return 'GC';
  if (createdByRole === 'FC') return 'TC';
  return null;
}

export function COBoardCard({ co, isActive, onClick }: COBoardCardProps) {
  const stripe = useMemo(() => getStripeColor(co), [co]);
  const progress = getProgress(co.status);
  const isRejected = co.status === 'rejected';
  const title = co.title ?? co.co_number ?? 'Untitled CO';
  const dotColor = getDotColor(co.status);

  // BUG 6: Show all involved role avatars
  const roles = useMemo(() => {
    const set = new Set<string>();
    if (co.created_by_role) set.add(co.created_by_role);
    const assigned = getAssignedRole(co.created_by_role);
    if (assigned && co.assigned_to_org_id) set.add(assigned);
    if (co.collaboratorOrgId && co.collaboratorStatus === 'active') set.add('FC');
    return Array.from(set);
  }, [co.created_by_role, co.assigned_to_org_id, co.collaboratorOrgId, co.collaboratorStatus]);

  return (
    <article
      className={cn(
        'relative bg-card border border-border rounded-lg cursor-pointer transition-all',
        'hover:shadow-md hover:border-foreground/20',
        isActive && 'ring-2 ring-primary shadow-lg',
      )}
      onClick={() => onClick(co.id)}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
        style={{ backgroundColor: stripe }}
      />

      <div className="pl-3 pr-3 pt-3 pb-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {co.co_number ?? '—'}
          </span>
          {co.pricing_type && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
              {PRICING_BADGE[co.pricing_type] ?? co.pricing_type}
            </Badge>
          )}
        </div>

        <h4 className="text-sm font-medium text-foreground line-clamp-2 leading-snug" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
          {title}
        </h4>

        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', dotColor)} />
            <span className={cn('relative inline-flex rounded-full h-2 w-2', dotColor)} />
          </span>
          <span className="text-[11px] text-muted-foreground truncate">
            {CO_STATUS_LABELS[co.status as COStatus]}
          </span>
        </div>

        <div className="h-[3px] bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress * 100}%`,
              backgroundColor: isRejected ? 'hsl(var(--destructive))' : stripe,
            }}
          />
        </div>

        <div className="flex items-center justify-between pt-0.5">
          <div className="flex -space-x-1.5">
            {roles.map(r => (
              <span key={r} className={cn(
                'inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold text-white ring-1 ring-card',
                ROLE_COLORS[r] ?? 'bg-muted',
              )}>
                {r.charAt(0)}
              </span>
            ))}
          </div>
          <span className="text-xs font-medium text-foreground" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {fmtCurrency(co.tc_submitted_price ?? 0)}
          </span>
        </div>
      </div>
    </article>
  );
}
