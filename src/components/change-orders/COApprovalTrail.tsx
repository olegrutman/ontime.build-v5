import { cn } from '@/lib/utils';
import type { COStatus } from '@/types/changeOrder';

/**
 * Collapses the CO status lifecycle into a 4-stage approval trail:
 * Drafted -> Submitted -> Priced -> Approved
 */
const STAGE_INDEX: Record<COStatus, number> = {
  draft: 0,
  shared: 0,
  work_in_progress: 1,
  closed_for_pricing: 1,
  submitted: 2,
  approved: 3,
  contracted: 3,
  rejected: -1,
  withdrawn: -1,
};

/** Stages the CO is sitting in, waiting on somebody -> amber segment. */
const PENDING: COStatus[] = ['draft', 'shared', 'closed_for_pricing', 'submitted'];

export function coTrailLabel(status: COStatus): string {
  switch (status) {
    case 'draft': return 'Drafted · awaiting submission';
    case 'shared': return 'Shared · awaiting response';
    case 'work_in_progress': return 'Work in progress';
    case 'closed_for_pricing': return 'Closed · awaiting pricing';
    case 'submitted': return 'Priced · awaiting approval';
    case 'approved': return 'Fully approved';
    case 'contracted': return 'Contracted';
    case 'rejected': return 'Rejected';
    case 'withdrawn': return 'Withdrawn';
    default: return '—';
  }
}

interface COApprovalTrailProps {
  status: COStatus;
  className?: string;
  /** hide the caption line */
  compact?: boolean;
}

export function COApprovalTrail({ status, className, compact = false }: COApprovalTrailProps) {
  const reached = STAGE_INDEX[status] ?? -1;
  const pending = PENDING.includes(status);
  const closed = status === 'rejected' || status === 'withdrawn';

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map(i => {
          const done = i < reached || (i === reached && !pending);
          const active = i === reached && pending;
          return (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-700',
                closed && 'bg-muted',
                !closed && done && 'bg-emerald-500',
                !closed && active && 'bg-secondary',
                !closed && !done && !active && 'bg-muted',
              )}
            />
          );
        })}
      </div>
      {!compact && (
        <p
          className={cn(
            'mt-1 text-[0.6rem] font-semibold uppercase tracking-wider truncate',
            status === 'approved' || status === 'contracted'
              ? 'text-emerald-600 dark:text-emerald-400'
              : status === 'rejected'
                ? 'text-destructive'
                : pending
                  ? 'text-secondary'
                  : 'text-muted-foreground',
          )}
        >
          {coTrailLabel(status)}
        </p>
      )}
    </div>
  );
}
