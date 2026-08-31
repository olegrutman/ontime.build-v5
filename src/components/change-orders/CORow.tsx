import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ChangeOrderWithMembers } from '@/hooks/useChangeOrders';
import type { COStatus } from '@/types/changeOrder';
import { COApprovalTrail } from './COApprovalTrail';
import { EntrySourcePill } from './EntrySourcePill';

const PRICING_BADGE: Record<string, string> = { fixed: 'Fixed', tm: 'T&M', nte: 'NTE' };

interface CORowProps {
  co: ChangeOrderWithMembers;
  onClick: (id: string) => void;
  /** this CO is waiting on the viewer's organization */
  needsAction?: boolean;
  /** show a checkbox instead of navigating on click (proposal bundling) */
  selectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  /** already part of an active proposal */
  bundledLabel?: string | null;
}

const money = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CORow({ co, onClick, needsAction = false, selectable = false, isSelected = false, onSelect, bundledLabel = null }: CORowProps) {

  const status = co.status as COStatus;
  const amount = (co as { display_total?: number }).display_total ?? co.tc_submitted_price ?? 0;
  const isApproved = status === 'approved' || status === 'contracted';
  const isClosed = status === 'withdrawn' || status === 'rejected';
  const days = differenceInDays(new Date(), new Date(co.created_at));
  const stale = !isApproved && !isClosed && days > 14;

  return (
    <article
      onClick={() => (selectable ? onSelect?.(co.id, !isSelected) : onClick(co.id))}
      data-sasha-card="Change Order"
      className={cn(
        'group cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md',
        'flex flex-col gap-3 md:grid md:grid-cols-12 md:items-center md:gap-4 md:px-6 md:py-4',
        'border-b-4',
        isApproved ? 'border-b-emerald-500' : needsAction ? 'border-b-secondary' : 'border-b-border',
        isClosed && 'opacity-60',
        selectable && isSelected && 'ring-2 ring-secondary',
      )}
    >
      {/* Description & requester */}
      <div className="min-w-0 space-y-1 md:col-span-5">
        <div className="flex flex-wrap items-center gap-2">
          {selectable && (
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                isSelected ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-background',
              )}
              aria-hidden
            >
              {isSelected && <span className="text-[9px] font-bold leading-none">✓</span>}
            </span>
          )}
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-[0.65rem] font-semibold text-muted-foreground">
            {co.co_number ?? '—'}
          </span>
          {bundledLabel && (
            <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground">
              In {bundledLabel}
            </span>
          )}
          <EntrySourcePill source={(co as { entry_source?: 'picker_v3' | 'ai_intake' | 'guided_v4' | 'field_pn' | null }).entry_source} />

          {co.pricing_type && (
            <Badge variant="secondary" className="h-5 px-1.5 py-0 text-[10px]">
              {PRICING_BADGE[co.pricing_type] ?? co.pricing_type}
            </Badge>
          )}
        </div>
        <h3
          className={cn(
            'text-sm font-semibold leading-snug text-foreground line-clamp-2',
            isClosed && 'line-through text-muted-foreground',
          )}
        >
          {co.title ?? co.co_number ?? 'Untitled'}
        </h3>
      </div>

      {/* Approval trail */}
      <div className="md:col-span-3">
        <COApprovalTrail status={status} />
      </div>

      {/* Amount */}
      <div className="flex items-baseline justify-between gap-2 md:col-span-2 md:block md:text-right">
        <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">Amount</p>
        <p className="font-mono tabular-nums text-base font-semibold text-foreground md:text-lg">
          {amount > 0 ? money(amount) : <span className="text-muted-foreground">TBD</span>}
        </p>
      </div>

      {/* Age / flag */}
      <div className="flex items-center justify-between gap-2 md:col-span-2 md:flex-col md:items-end md:justify-center md:gap-1">
        <span
          className={cn(
            'font-mono tabular-nums text-xs font-semibold',
            stale ? 'text-secondary' : 'text-muted-foreground',
          )}
        >
          {isApproved || isClosed ? 'Closed' : `${days}d open`}
        </span>
        {needsAction && !isApproved && !isClosed && (
          <span className="inline-flex items-center rounded-full border border-secondary/30 bg-secondary/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-secondary">
            Your move
          </span>
        )}
      </div>
    </article>
  );
}
