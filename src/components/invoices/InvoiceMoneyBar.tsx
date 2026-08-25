import { useMemo } from 'react';
import { differenceInDays } from 'date-fns';
import { Invoice } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface InvoiceMoneyBarProps {
  invoices: Invoice[];
  /** true when the viewer is the approver / payer side */
  isApprover: boolean;
  /** payment terms in days used to flag overdue (default net 30) */
  netDays?: number;
}

const LIVE = ['SUBMITTED', 'APPROVED', 'PAID'];

export function useInvoiceMoney(invoices: Invoice[], isApprover: boolean, netDays = 30) {
  return useMemo(() => {
    const now = new Date();
    const live = invoices.filter(i => LIVE.includes(i.status));

    const totalBilled = live.reduce((s, i) => s + i.total_amount, 0);
    const paid = live.filter(i => i.status === 'PAID');
    const totalPaid = paid.reduce((s, i) => s + i.total_amount, 0);

    const openInvoices = live.filter(i => i.status === 'SUBMITTED' || i.status === 'APPROVED');
    const outstanding = openInvoices.reduce((s, i) => s + i.total_amount, 0);

    const overdueInvoices = openInvoices.filter(i => {
      const ref = i.approved_at || i.submitted_at || i.created_at;
      return differenceInDays(now, new Date(ref)) > netDays;
    });
    const overdue = overdueInvoices.reduce((s, i) => s + i.total_amount, 0);

    const actionStatuses = isApprover ? ['SUBMITTED'] : ['DRAFT'];
    const needsAction = invoices.filter(i => actionStatuses.includes(i.status));
    const needsActionTotal = needsAction.reduce((s, i) => s + i.total_amount, 0);

    const paymentDays = paid
      .filter(i => i.paid_at && (i.submitted_at || i.created_at))
      .map(i => differenceInDays(new Date(i.paid_at!), new Date(i.submitted_at || i.created_at)))
      .filter(d => d >= 0);
    const avgPaymentDays = paymentDays.length
      ? Math.round(paymentDays.reduce((a, b) => a + b, 0) / paymentDays.length)
      : null;

    const collectedPct = totalBilled > 0 ? Math.min(100, (totalPaid / totalBilled) * 100) : 0;

    return {
      totalBilled, totalPaid, outstanding, overdue,
      overdueCount: overdueInvoices.length,
      openCount: openInvoices.length,
      paidCount: paid.length,
      needsActionCount: needsAction.length,
      needsActionTotal,
      avgPaymentDays,
      collectedPct,
    };
  }, [invoices, isApprover, netDays]);
}

function Tile({
  label, value, sub, tone = 'default',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'paid' | 'dark' | 'alert';
}) {
  const isDark = tone === 'dark';
  return (
    <div
      className={cn(
        'rounded-2xl p-3.5 sm:p-4 border shadow-sm min-w-0',
        isDark
          ? 'bg-[hsl(var(--navy))] border-transparent'
          : 'bg-card border-border',
        tone === 'paid' && 'border-b-4 border-b-emerald-500',
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
          isDark ? 'text-white' : tone === 'alert' ? 'text-secondary' : tone === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground',
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

export function InvoiceMoneyBar({ invoices, isApprover, netDays = 30 }: InvoiceMoneyBarProps) {
  const m = useInvoiceMoney(invoices, isApprover, netDays);

  return (
    <section className="space-y-3">
      {/* Collection progress hero */}
      <div className="relative overflow-hidden rounded-2xl bg-[hsl(var(--navy))] p-4 sm:p-6">
        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 md:w-1/2">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-primary">
              {isApprover ? 'Payment progress' : 'Collection progress'}
            </p>
            <div className="mt-1 flex flex-wrap items-baseline gap-2">
              <span className="font-mono tabular-nums text-3xl sm:text-4xl font-semibold text-white">
                {formatCurrency(m.totalPaid)}
              </span>
              <span className="text-xs sm:text-sm text-white/60">
                of {formatCurrency(m.totalBilled)} billed
              </span>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-primary transition-all duration-700"
                style={{ width: `${m.collectedPct}%` }}
              />
            </div>
            <p className="mt-1.5 text-[0.65rem] uppercase tracking-wider text-white/50">
              {Math.round(m.collectedPct)}% collected · {m.paidCount} paid · {m.openCount} open
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 sm:gap-6 md:text-right">
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/50">Outstanding</p>
              <p className="font-mono tabular-nums text-base sm:text-xl text-white">{formatCurrency(m.outstanding)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-secondary">Overdue</p>
              <p className="font-mono tabular-nums text-base sm:text-xl text-secondary">{formatCurrency(m.overdue)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-white/50">Avg. payment</p>
              <p className="font-mono tabular-nums text-base sm:text-xl text-white">
                {m.avgPaymentDays !== null ? `${m.avgPaymentDays}d` : '—'}
              </p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 sm:gap-4">
        <Tile
          label="Total Paid"
          value={formatCurrency(m.totalPaid)}
          sub={`${m.paidCount} invoice${m.paidCount === 1 ? '' : 's'} settled`}
          tone="paid"
        />
        <Tile
          label="Total Billed"
          value={formatCurrency(m.totalBilled)}
          sub={`${m.paidCount + m.openCount} live invoice${m.paidCount + m.openCount === 1 ? '' : 's'}`}
        />
        <Tile
          label="Outstanding"
          value={formatCurrency(m.outstanding)}
          sub={`${m.openCount} awaiting payment`}
          tone="dark"
        />
        <Tile
          label={isApprover ? 'Overdue to pay' : 'Overdue'}
          value={formatCurrency(m.overdue)}
          sub={m.overdueCount > 0 ? `${m.overdueCount} past net ${netDays}` : `None past net ${netDays}`}
          tone="alert"
        />
      </div>

      {m.needsActionCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-secondary/30 bg-secondary/10 px-4 py-2.5">
          <p className="text-xs sm:text-sm font-medium text-foreground">
            <span className="font-mono tabular-nums font-semibold">{m.needsActionCount}</span>{' '}
            invoice{m.needsActionCount === 1 ? '' : 's'} {isApprover ? 'awaiting your approval' : 'still in draft'}
          </p>
          <p className="font-mono tabular-nums text-xs sm:text-sm text-muted-foreground shrink-0">
            {formatCurrency(m.needsActionTotal)}
          </p>
        </div>
      )}
    </section>
  );
}
