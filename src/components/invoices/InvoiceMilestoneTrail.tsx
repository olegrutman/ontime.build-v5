import { format } from 'date-fns';
import { Invoice } from '@/types/invoice';
import { cn } from '@/lib/utils';

const short = (v: string | null | undefined) => (v ? format(new Date(v), 'MM/dd') : '—');

/**
 * Compact submitted → approved → paid trail.
 * Three segments fill as the invoice moves through the lifecycle.
 */
export function InvoiceMilestoneTrail({ invoice, className }: { invoice: Invoice; className?: string }) {
  const rejected = invoice.status === 'REJECTED';
  const voided = invoice.status === 'VOIDED';

  const steps = [
    { label: 'Sub', at: invoice.submitted_at },
    { label: 'App', at: rejected ? invoice.rejected_at : invoice.approved_at },
    { label: 'Paid', at: invoice.paid_at },
  ];

  return (
    <div className={cn('min-w-[104px]', className)}>
      <div className="flex items-center gap-1">
        {steps.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              'h-1.5 flex-1 rounded-full',
              !s.at
                ? 'bg-muted'
                : voided
                ? 'bg-muted-foreground/40'
                : rejected && i === 1
                ? 'bg-destructive'
                : 'bg-emerald-500',
            )}
          />
        ))}
      </div>
      <div className="mt-1 flex items-center gap-1 text-[0.6rem] font-mono tabular-nums text-muted-foreground">
        {steps.map((s) => (
          <span key={s.label} className="flex-1 truncate">
            {short(s.at)}
          </span>
        ))}
      </div>
    </div>
  );
}
