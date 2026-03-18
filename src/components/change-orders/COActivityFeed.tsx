import { formatDistanceToNow } from 'date-fns';
import { Activity } from 'lucide-react';
import type { COActivityEntry } from '@/types/changeOrder';
import { cn } from '@/lib/utils';

interface COActivityFeedProps {
  activity: COActivityEntry[];
}

const ACTION_LABELS: Record<string, string> = {
  created: 'created this CO',
  shared: 'shared this CO',
  combined: 'combined COs',
  submitted: 'submitted for approval',
  approved: 'approved',
  rejected: 'rejected',
  contracted: 'contracted',
  nte_warning: 'NTE cap warning triggered',
  nte_requested: 'requested NTE increase',
  nte_approved: 'approved NTE increase',
  nte_rejected: 'declined NTE increase',
  labor_added: 'logged labor',
  materials_added: 'added materials',
  equipment_added: 'added equipment',
  note_added: 'added a note',
  recalled: 'recalled submission',
};

const ROLE_STYLES: Record<string, string> = {
  GC: 'co-light-role-gc',
  TC: 'co-light-role-tc',
  FC: 'co-light-role-fc',
};

export function COActivityFeed({ activity }: COActivityFeedProps) {
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
        {activity.map(entry => (
          <div key={entry.id} className="flex items-start gap-2.5">
            <span
              className={cn(
                'text-[10px] font-semibold rounded-full px-1.5 py-0.5 mt-0.5 shrink-0',
                ROLE_STYLES[entry.actor_role] ?? 'bg-muted text-muted-foreground',
              )}
            >
              {entry.actor_role}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-foreground">
                {ACTION_LABELS[entry.action] ?? entry.action}
                {entry.amount != null && (
                  <span className="font-medium text-muted-foreground ml-1">
                    — ${entry.amount.toLocaleString('en-US', {
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
        ))}
      </div>
    </div>
  );
}
