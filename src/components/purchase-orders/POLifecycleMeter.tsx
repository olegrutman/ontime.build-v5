import { format } from 'date-fns';
import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';
import { cn } from '@/lib/utils';

/**
 * Collapses the 10-state PO status pipeline into 5 visual lifecycle stages
 * and renders them as segment meters (matching the Invoices milestone trail).
 */
const STAGES = ['Submitted', 'Priced', 'Ordered', 'Delivered', 'Finalized'] as const;

const STAGE_INDEX: Record<POStatus, number> = {
  DRAFT: -1,
  ACTIVE: -1,
  PENDING_APPROVAL: 0,
  SENT: 0,
  SUBMITTED: 0,
  PRICED: 1,
  ORDERED: 2,
  READY_FOR_DELIVERY: 2,
  DELIVERED: 3,
  FINALIZED: 4,
};

/** Statuses that are waiting on somebody: the current segment turns amber. */
const PENDING_STATUSES: POStatus[] = ['PENDING_APPROVAL', 'SUBMITTED', 'SENT', 'READY_FOR_DELIVERY'];

export function poStageDates(po: PurchaseOrder): (string | null)[] {
  return [
    po.submitted_at || null,
    po.priced_at || null,
    po.ordered_at || null,
    po.delivered_at || null,
    po.status === 'FINALIZED' ? po.updated_at || null : null,
  ];
}

export function poLifecycleLabel(po: PurchaseOrder): string {
  const status = po.status as POStatus;
  switch (status) {
    case 'ACTIVE':
    case 'DRAFT': return 'Draft — not submitted';
    case 'PENDING_APPROVAL': return 'Awaiting approval';
    case 'SUBMITTED':
    case 'SENT': return 'Awaiting pricing';
    case 'PRICED': return 'Awaiting order';
    case 'ORDERED': return 'Pending delivery';
    case 'READY_FOR_DELIVERY': return 'Ready for delivery';
    case 'DELIVERED': return 'Delivered';
    case 'FINALIZED': return 'Finalized';
    default: return '—';
  }
}

interface POLifecycleMeterProps {
  po: PurchaseOrder;
  /** compact hides the stage labels row (used in dense card layouts) */
  compact?: boolean;
  className?: string;
}

export function POLifecycleMeter({ po, compact = false, className }: POLifecycleMeterProps) {
  const status = po.status as POStatus;
  const reached = STAGE_INDEX[status] ?? -1;
  const isPending = PENDING_STATUSES.includes(status);
  const dates = poStageDates(po);

  return (
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center gap-1">
        {STAGES.map((stage, i) => {
          const done = i < reached || (i === reached && !isPending);
          const active = i === reached && isPending;
          return (
            <div
              key={stage}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-700',
                done && 'bg-emerald-500',
                active && 'bg-secondary',
                !done && !active && 'bg-muted',
              )}
            />
          );
        })}
      </div>

      {!compact && (
        <div className="mt-1.5 flex justify-between gap-1">
          {STAGES.map((stage, i) => {
            const done = i < reached || (i === reached && !isPending);
            const active = i === reached && isPending;
            const date = dates[i];
            return (
              <div key={stage} className="min-w-0 flex-1 leading-tight">
                <p
                  className={cn(
                    'text-[0.55rem] font-semibold uppercase tracking-[0.08em] truncate',
                    done ? 'text-emerald-600 dark:text-emerald-400'
                      : active ? 'text-secondary'
                      : 'text-muted-foreground/50',
                  )}
                >
                  {stage.slice(0, 4)}
                </p>
                <p className="font-mono text-[0.55rem] tabular-nums text-muted-foreground truncate">
                  {date ? format(new Date(date), 'MMM d') : active ? '···' : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
