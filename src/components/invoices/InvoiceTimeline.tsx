import { useEffect, useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { FileText, Send, CheckCircle2, DollarSign, XCircle, Ban, Circle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Invoice } from '@/types/invoice';
import { cn } from '@/lib/utils';

interface Step {
  key: string;
  label: string;
  at: string | null;
  by?: string | null;
  icon: typeof FileText;
  tone: string;
  note?: string | null;
  pendingLabel?: string;
}

/** Compact one-line milestone summary used by list rows/cards. */
export function invoiceMilestoneSummary(invoice: Invoice): string {
  const f = (d: string) => format(new Date(d), 'MMM d');
  if (invoice.voided_at) return `Voided ${f(invoice.voided_at)}`;
  if (invoice.paid_at) {
    const ref = invoice.submitted_at || invoice.created_at;
    const days = differenceInDays(new Date(invoice.paid_at), new Date(ref));
    return `Paid ${f(invoice.paid_at)}${days >= 0 ? ` · ${days}d to pay` : ''}`;
  }
  if (invoice.status === 'REJECTED' && invoice.rejected_at) return `Rejected ${f(invoice.rejected_at)}`;
  if (invoice.approved_at) {
    const days = differenceInDays(new Date(), new Date(invoice.approved_at));
    return `Approved ${f(invoice.approved_at)} · awaiting payment ${days}d`;
  }
  if (invoice.submitted_at) {
    const days = differenceInDays(new Date(), new Date(invoice.submitted_at));
    return `Submitted ${f(invoice.submitted_at)} · pending ${days}d`;
  }
  return `Draft created ${f(invoice.created_at)}`;
}

/** "Paid in N days" / "Outstanding N days" header signal. */
export function invoicePaceLabel(invoice: Invoice): string | null {
  const ref = invoice.submitted_at || invoice.created_at;
  if (invoice.status === 'VOIDED') return null;
  if (invoice.paid_at) {
    const d = differenceInDays(new Date(invoice.paid_at), new Date(ref));
    return `Paid in ${Math.max(d, 0)} ${d === 1 ? 'day' : 'days'}`;
  }
  if (invoice.status === 'SUBMITTED' || invoice.status === 'APPROVED') {
    const d = differenceInDays(new Date(), new Date(ref));
    return `Outstanding ${Math.max(d, 0)} ${d === 1 ? 'day' : 'days'}`;
  }
  return null;
}

export function InvoiceTimeline({ invoice }: { invoice: Invoice }) {
  const [names, setNames] = useState<Record<string, string>>({});

  const actorIds = [
    invoice.created_by,
    invoice.submitted_by,
    invoice.approved_by,
    invoice.rejected_by,
    invoice.paid_by,
    invoice.voided_by,
  ].filter((v): v is string => !!v);

  useEffect(() => {
    const ids = Array.from(new Set(actorIds));
    if (ids.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', ids);
      if (cancelled || !data) return;
      const map: Record<string, string> = {};
      for (const p of data as { id: string; full_name: string | null; email: string | null }[]) {
        map[p.id] = p.full_name || p.email || 'Unknown user';
      }
      setNames(map);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actorIds.join(',')]);

  const steps: Step[] = [
    {
      key: 'created',
      label: 'Created',
      at: invoice.created_at,
      by: invoice.created_by,
      icon: FileText,
      tone: 'text-muted-foreground',
    },
    {
      key: 'submitted',
      label: 'Submitted',
      at: invoice.submitted_at,
      by: invoice.submitted_by,
      icon: Send,
      tone: 'text-blue-600 dark:text-blue-400',
      pendingLabel: 'Not submitted yet',
    },
  ];

  if (invoice.status === 'REJECTED' || invoice.rejected_at) {
    steps.push({
      key: 'rejected',
      label: 'Rejected',
      at: invoice.rejected_at,
      by: invoice.rejected_by,
      icon: XCircle,
      tone: 'text-red-600 dark:text-red-400',
      note: invoice.rejection_reason,
    });
  }

  steps.push({
    key: 'approved',
    label: 'Approved',
    at: invoice.approved_at,
    by: invoice.approved_by,
    icon: CheckCircle2,
    tone: 'text-emerald-600 dark:text-emerald-400',
    pendingLabel: 'Awaiting approval',
  });

  const paymentNote = [
    invoice.payment_method,
    invoice.payment_reference ? `Ref ${invoice.payment_reference}` : null,
    invoice.payment_note,
  ].filter(Boolean).join(' · ') || null;

  steps.push({
    key: 'paid',
    label: 'Paid',
    at: invoice.paid_at,
    by: invoice.paid_by,
    icon: DollarSign,
    tone: 'text-emerald-700 dark:text-emerald-300',
    note: paymentNote,
    pendingLabel: 'Awaiting payment',
  });

  if (invoice.voided_at) {
    steps.push({
      key: 'voided',
      label: 'Voided',
      at: invoice.voided_at,
      by: invoice.voided_by,
      icon: Ban,
      tone: 'text-muted-foreground',
      note: invoice.void_reason,
    });
  }

  const completed = steps.filter((s) => s.at);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Payment Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="relative space-y-3.5">
          {steps.map((step, i) => {
            const Icon = step.at ? step.icon : Circle;
            const prev = completed[completed.indexOf(step) - 1];
            const gap =
              step.at && prev?.at
                ? differenceInDays(new Date(step.at), new Date(prev.at))
                : null;
            const isLast = i === steps.length - 1;
            return (
              <li key={step.key} className="relative flex gap-3">
                {!isLast && (
                  <span
                    className="absolute left-[11px] top-6 bottom-[-14px] w-px bg-border"
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    'relative z-10 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full border bg-card',
                    step.at ? 'border-border' : 'border-dashed border-border'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', step.at ? step.tone : 'text-muted-foreground/50')} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className={cn('text-sm font-semibold', !step.at && 'text-muted-foreground/70')}>
                      {step.label}
                    </span>
                    {step.at ? (
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {format(new Date(step.at), 'MMM d, yyyy · h:mm a')}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/70">
                        {step.pendingLabel || 'Pending'}
                      </span>
                    )}
                    {gap !== null && gap > 0 && (
                      <span className="font-mono text-[11px] text-muted-foreground/80">+{gap}d</span>
                    )}
                  </div>
                  {step.at && step.by && (
                    <p className="text-xs text-muted-foreground truncate">
                      by {names[step.by] || '…'}
                    </p>
                  )}
                  {step.at && step.note && (
                    <p className="text-xs text-muted-foreground mt-0.5 break-words">{step.note}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
