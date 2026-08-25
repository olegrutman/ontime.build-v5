import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import type { ChangeOrderWithMembers } from '@/hooks/useChangeOrders';
import type { COStatus } from '@/types/changeOrder';
import { cn } from '@/lib/utils';

interface COMoneyBarProps {
  changeOrders: ChangeOrderWithMembers[];
  /** short doc label, e.g. "CO" or "WO" */
  abbrev: string;
  className?: string;
}

const APPROVED: COStatus[] = ['approved', 'contracted'];
const AWAITING_APPROVAL: COStatus[] = ['submitted'];
const AWAITING_PRICING: COStatus[] = ['closed_for_pricing', 'work_in_progress', 'shared', 'draft'];
const EXCLUDED: COStatus[] = ['withdrawn', 'rejected'];

const amountOf = (co: ChangeOrderWithMembers) =>
  (co as { display_total?: number }).display_total ?? co.tc_submitted_price ?? 0;

export function useCOMoney(changeOrders: ChangeOrderWithMembers[]) {
  return useMemo(() => {
    const live = changeOrders.filter(co => !EXCLUDED.includes(co.status as COStatus));

    const approved = live.filter(co => APPROVED.includes(co.status as COStatus));
    const approvedTotal = approved.reduce((s, co) => s + amountOf(co), 0);

    const requestedTotal = live.reduce((s, co) => s + amountOf(co), 0);

    const awaitingApproval = live.filter(co => AWAITING_APPROVAL.includes(co.status as COStatus));
    const awaitingApprovalTotal = awaitingApproval.reduce((s, co) => s + amountOf(co), 0);

    const awaitingPricing = live.filter(co => AWAITING_PRICING.includes(co.status as COStatus));
    const awaitingPricingTotal = awaitingPricing.reduce((s, co) => s + amountOf(co), 0);

    const outstanding = requestedTotal - approvedTotal;

    const openCOs = live.filter(co => !APPROVED.includes(co.status as COStatus));
    const ages = openCOs.map(co => differenceInDays(new Date(), new Date(co.created_at)));
    const avgAge = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null;

    const approvedPct = requestedTotal > 0 ? Math.min(100, (approvedTotal / requestedTotal) * 100) : 0;

    return {
      approvedTotal, approvedCount: approved.length,
      requestedTotal, liveCount: live.length,
      awaitingApprovalTotal, awaitingApprovalCount: awaitingApproval.length,
      awaitingPricingTotal, awaitingPricingCount: awaitingPricing.length,
      outstanding, openCount: openCOs.length,
      avgAge, approvedPct,
    };
  }, [changeOrders]);
}

const money = (v: number) =>
  `$${Math.round(v).toLocaleString('en-US')}`;

function Tile({
  label, value, sub, tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'approved' | 'dark' | 'alert';
}) {
  const isDark = tone === 'dark';
  return (
    <div
      className={cn(
        'rounded-2xl p-3.5 sm:p-4 border shadow-sm min-w-0',
        isDark ? 'bg-[hsl(var(--navy))] border-transparent' : 'bg-card border-border',
        tone === 'approved' && 'border-b-4 border-b-emerald-500',
        tone === 'alert' && 'border-b-4 border-b-secondary',
        tone === 'default' && 'border-b-4 border-b-[hsl(var(--navy))]',
      )}
    >
      <p
        className={cn(
          'text-[0.6rem] sm:text-[0.65rem] font-semibold uppercase tracking-[0.14em] truncate',
          isDark ? 'text-white/60' : tone === 'alert' ? 'text-secondary' : 'text-muted-foreground',
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'font-mono tabular-nums font-semibold leading-tight mt-1 text-lg sm:text-2xl',
          isDark ? 'text-white'
            : tone === 'alert' ? 'text-secondary'
            : tone === 'approved' ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-foreground',
        )}
      >
        {value}
      </p>
      {sub && (
        <p className={cn('text-[0.65rem] mt-1 truncate', isDark ? 'text-white/50' : 'text-muted-foreground')}>
          {sub}
        </p>
      )}
    </div>
  );
}

export function COMoneyBar({ changeOrders, abbrev, className }: COMoneyBarProps) {
  const m = useCOMoney(changeOrders);

  return (
    <section className={cn('space-y-3', className)}>
      {/* Money hero */}
      <div className="relative overflow-hidden rounded-2xl bg-[hsl(var(--navy))] p-4 sm:p-6">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 md:w-1/2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-primary">
              Approved {abbrev} value
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="font-mono tabular-nums text-3xl sm:text-4xl font-semibold text-white">
                {money(m.approvedTotal)}
              </span>
              <span className="text-xs sm:text-sm text-white/60">
                of {money(m.requestedTotal)} requested
              </span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${m.approvedPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.65rem] uppercase tracking-wider text-white/50">
              {Math.round(m.approvedPct)}% approved · {m.approvedCount} signed off · {m.openCount} open
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-6 md:text-right">
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/50">Outstanding</p>
              <p className="font-mono tabular-nums text-base sm:text-xl text-white">{money(m.outstanding)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-secondary">Avg. age</p>
              <p className="font-mono tabular-nums text-base sm:text-xl text-secondary">
                {m.avgAge !== null ? `${m.avgAge}d` : '—'}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/50">Open {abbrev}s</p>
              <p className="font-mono tabular-nums text-base sm:text-xl text-white">{m.openCount}</p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 sm:gap-4">
        <Tile
          label="Approved"
          value={money(m.approvedTotal)}
          sub={`${m.approvedCount} ${abbrev}${m.approvedCount === 1 ? '' : 's'} signed off`}
          tone="approved"
        />
        <Tile
          label="Total requested"
          value={money(m.requestedTotal)}
          sub={`${m.liveCount} live ${abbrev}${m.liveCount === 1 ? '' : 's'}`}
        />
        <Tile
          label="Pending pricing"
          value={money(m.awaitingPricingTotal)}
          sub={`${m.awaitingPricingCount} awaiting price`}
          tone="dark"
        />
        <Tile
          label="Awaiting approval"
          value={money(m.awaitingApprovalTotal)}
          sub={`${m.awaitingApprovalCount} submitted for sign-off`}
          tone="alert"
        />
      </div>
    </section>
  );
}
