import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';
import { formatCurrency, cn } from '@/lib/utils';

interface POMoneyBarProps {
  purchaseOrders: PurchaseOrder[];
  /** true when the viewer is the supplier side (prices POs rather than issuing them) */
  isSupplier: boolean;
  /** hide dollar values when another party owns pricing */
  hidePricing?: boolean;
  /** POs already turned into an invoice */
  invoicedPOIds?: Set<string>;
  /** days after ordering before a delivery is considered late */
  lateAfterDays?: number;
}

/** Value considered committed to a supplier (priced and past the pricing stage). */
const COMMITTED: POStatus[] = ['PRICED', 'ORDERED', 'READY_FOR_DELIVERY', 'DELIVERED', 'FINALIZED'];
const RECEIVED: POStatus[] = ['DELIVERED', 'FINALIZED'];
const IN_TRANSIT: POStatus[] = ['ORDERED', 'READY_FOR_DELIVERY'];

export function usePOMoney(
  purchaseOrders: PurchaseOrder[],
  isSupplier: boolean,
  invoicedPOIds?: Set<string>,
  lateAfterDays = 14,
) {
  return useMemo(() => {
    const now = new Date();
    const val = (po: PurchaseOrder) => po.po_total || 0;

    const committed = purchaseOrders.filter(po => COMMITTED.includes(po.status as POStatus));
    const committedTotal = committed.reduce((s, po) => s + val(po), 0);

    const received = purchaseOrders.filter(po => RECEIVED.includes(po.status as POStatus));
    const receivedTotal = received.reduce((s, po) => s + val(po), 0);

    const inTransit = purchaseOrders.filter(po => IN_TRANSIT.includes(po.status as POStatus));
    const inTransitTotal = inTransit.reduce((s, po) => s + val(po), 0);

    const late = inTransit.filter(po => {
      const ref = po.ready_for_delivery_at || po.ordered_at;
      if (!ref) return false;
      return po.ready_for_delivery_at
        ? new Date(po.ready_for_delivery_at) < now
        : differenceInDays(now, new Date(ref)) > lateAfterDays;
    });
    const lateTotal = late.reduce((s, po) => s + val(po), 0);

    const uninvoiced = received.filter(po => !invoicedPOIds?.has(po.id));
    const uninvoicedTotal = uninvoiced.reduce((s, po) => s + val(po), 0);

    const actionStatuses: POStatus[] = isSupplier
      ? ['SUBMITTED', 'SENT']
      : ['ACTIVE', 'DRAFT', 'PENDING_APPROVAL', 'PRICED'];
    const needsAction = purchaseOrders.filter(po => actionStatuses.includes(po.status as POStatus));
    const needsActionTotal = needsAction.reduce((s, po) => s + val(po), 0);

    const receivedPct = committedTotal > 0 ? Math.min(100, (receivedTotal / committedTotal) * 100) : 0;

    return {
      committedTotal, committedCount: committed.length,
      receivedTotal, receivedCount: received.length,
      inTransitTotal, inTransitCount: inTransit.length,
      lateTotal, lateCount: late.length,
      uninvoicedTotal, uninvoicedCount: uninvoiced.length,
      needsActionTotal, needsActionCount: needsAction.length,
      receivedPct,
    };
  }, [purchaseOrders, isSupplier, invoicedPOIds, lateAfterDays]);
}

function Tile({
  label, value, sub, tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'received' | 'dark' | 'alert';
}) {
  const isDark = tone === 'dark';
  return (
    <div
      className={cn(
        'rounded-2xl p-3.5 sm:p-4 border shadow-sm min-w-0',
        isDark ? 'bg-[hsl(var(--navy))] border-transparent' : 'bg-card border-border',
        tone === 'received' && 'border-b-4 border-b-emerald-500',
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
            : tone === 'received' ? 'text-emerald-600 dark:text-emerald-400'
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

export function POMoneyBar({
  purchaseOrders, isSupplier, hidePricing = false, invoicedPOIds, lateAfterDays = 14,
}: POMoneyBarProps) {
  const m = usePOMoney(purchaseOrders, isSupplier, invoicedPOIds, lateAfterDays);
  const money = (v: number) => (hidePricing ? '—' : formatCurrency(v));

  return (
    <section className="space-y-3">
      {/* Procurement progress hero */}
      <div className="relative overflow-hidden rounded-2xl bg-[hsl(var(--navy))] p-4 sm:p-6">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 md:w-1/2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-primary">
              {isSupplier ? 'Fulfillment progress' : 'Delivery progress'}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="font-mono tabular-nums text-3xl sm:text-4xl font-semibold text-white">
                {money(m.receivedTotal)}
              </span>
              <span className="text-xs sm:text-sm text-white/60">
                of {money(m.committedTotal)} committed
              </span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                style={{ width: `${m.receivedPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.65rem] uppercase tracking-wider text-white/50">
              {Math.round(m.receivedPct)}% received · {m.receivedCount} delivered · {m.inTransitCount} in transit
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-6 md:text-right">
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/50">Awaiting delivery</p>
              <p className="font-mono tabular-nums text-base sm:text-xl text-white">{money(m.inTransitTotal)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-secondary">Late</p>
              <p className="font-mono tabular-nums text-base sm:text-xl text-secondary">{money(m.lateTotal)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/50">Open POs</p>
              <p className="font-mono tabular-nums text-base sm:text-xl text-white">
                {purchaseOrders.length - m.receivedCount}
              </p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 sm:gap-4">
        <Tile
          label="Received value"
          value={money(m.receivedTotal)}
          sub={`${m.receivedCount} PO${m.receivedCount === 1 ? '' : 's'} delivered`}
          tone="received"
        />
        <Tile
          label="Total committed"
          value={money(m.committedTotal)}
          sub={`${m.committedCount} priced PO${m.committedCount === 1 ? '' : 's'}`}
        />
        <Tile
          label="Awaiting delivery"
          value={money(m.inTransitTotal)}
          sub={`${m.inTransitCount} in transit`}
          tone="dark"
        />
        <Tile
          label={isSupplier ? 'Unbilled' : 'Uninvoiced'}
          value={money(m.uninvoicedTotal)}
          sub={
            m.lateCount > 0
              ? `${m.lateCount} late shipment${m.lateCount === 1 ? '' : 's'}`
              : `${m.uninvoicedCount} delivered, not billed`
          }
          tone="alert"
        />
      </div>

      {m.needsActionCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-2.5">
          <p className="text-xs sm:text-sm font-medium text-foreground">
            <span className="font-mono tabular-nums font-semibold">{m.needsActionCount}</span>{' '}
            PO{m.needsActionCount === 1 ? '' : 's'} {isSupplier ? 'awaiting your pricing' : 'need your action'}
          </p>
          <p className="font-mono tabular-nums text-xs sm:text-sm text-muted-foreground shrink-0">
            {money(m.needsActionTotal)}
          </p>
        </div>
      )}
    </section>
  );
}
