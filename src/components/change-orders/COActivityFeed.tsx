import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';
import type { COActivityEntry } from '@/types/changeOrder';
import { cn } from '@/lib/utils';
import { useRoleLabels } from '@/hooks/useRoleLabels';

interface COActivityFeedProps {
  activity: COActivityEntry[];
  /** Role of the company reading the feed — drives which amounts are visible. */
  viewerRole?: 'GC' | 'TC' | 'FC' | null;
  projectId?: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'created this work order',
  shared: 'shared this work order',
  combined: 'combined work orders',
  submitted: 'submitted for approval',
  sent_to_wip: 'sent out as work in progress',
  closed_for_pricing: 'closed for final pricing',
  approved: 'approved',
  approved_fc: 'approved the crew scope',
  forwarded_to_gc: 'sent up for approval',
  rejected: 'rejected',
  recalled: 'recalled submission',
  withdrawn: 'withdrew this work order',
  contracted: 'contracted',
  marked_completed: 'marked the work complete',
  acknowledged_completion: 'acknowledged completion',
  backcharge_created: 'raised a backcharge',
  retainage_released: 'released retainage',
  nte_warning: 'not-to-exceed cap warning triggered',
  nte_requested: 'requested a not-to-exceed increase',
  nte_approved: 'approved a not-to-exceed increase',
  nte_rejected: 'declined a not-to-exceed increase',
  labor_added: 'logged labor',
  materials_added: 'added materials',
  equipment_added: 'added equipment',
  note_added: 'added a note',
  external_invite_sent: 'invited an external party',
  external_response: 'external party responded',
};

const ROLE_STYLES: Record<string, string> = {
  GC: 'co-light-role-gc',
  TC: 'co-light-role-tc',
  FC: 'co-light-role-fc',
};

/** Tier of each role in the chain: crew (0) -> subcontractor (1) -> general contractor (2). */
const TIER: Record<string, number> = { FC: 0, TC: 1, GC: 2 };

/**
 * Actions whose amount is a downstream (crew) figure even though a subcontractor
 * logged them — those must never reach the general contractor.
 */
const CREW_SCOPED_ACTIONS = new Set(['approved_fc']);

function canSeeAmount(entry: COActivityEntry, viewerRole?: 'GC' | 'TC' | 'FC' | null): boolean {
  if (!viewerRole) return false;
  const actorTier = TIER[entry.actor_role] ?? 0;
  const viewerTier = TIER[viewerRole] ?? 0;
  // A company sees money it logged itself, and money logged by the company that
  // bills it directly — never figures from further down the chain.
  if (viewerTier - actorTier > 1) return false;
  if (CREW_SCOPED_ACTIONS.has(entry.action) && viewerTier > 1) return false;
  return true;
}

export function COActivityFeed({ activity, viewerRole = null, projectId = null }: COActivityFeedProps) {
  const rl = useRoleLabels(projectId);

  if (activity.length === 0) {
    return (
      <div className="co-light-shell overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border co-light-header">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Activity</h3>
        </div>
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">No activity yet</div>
      </div>
    );
  }

  return (
    <div className="co-light-shell overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border co-light-header">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Activity</h3>
        <span className="text-xs text-muted-foreground">({activity.length})</span>
      </div>
      <div className="px-4 py-3 space-y-3">
        {activity.map(entry => {
          const actorName = rl.label(entry.actor_role as 'GC' | 'TC' | 'FC') || entry.actor_role;
          const showAmount = entry.amount != null && canSeeAmount(entry, viewerRole);
          return (
            <div key={entry.id} className="flex items-start gap-2.5">
              <span
                className={cn(
                  'text-[10px] font-semibold rounded-full px-1.5 py-0.5 mt-0.5 shrink-0',
                  ROLE_STYLES[entry.actor_role] ?? 'bg-muted text-muted-foreground',
                )}
                title={actorName}
              >
                {rl.initials(entry.actor_role as 'GC' | 'TC' | 'FC') || entry.actor_role}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-foreground">
                  <span className="font-medium">{actorName}</span>{' '}
                  {ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, ' ')}
                  {showAmount && (
                    <span className="font-medium text-muted-foreground ml-1">
                      — ${entry.amount!.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  )}
                </p>
                {entry.detail && <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.detail}</p>}
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
