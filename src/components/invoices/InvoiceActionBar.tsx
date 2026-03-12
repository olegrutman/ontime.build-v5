import { useMemo } from 'react';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Invoice } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';
import { differenceInDays } from 'date-fns';

interface InvoiceActionBarProps {
  invoices: Invoice[];
  /** true when the viewer is the approver side */
  isApprover: boolean;
}

export function InvoiceActionBar({ invoices, isApprover }: InvoiceActionBarProps) {
  const metrics = useMemo(() => {
    const now = new Date();

    // "Needs Action" — for approvers: SUBMITTED; for creators: DRAFT
    const actionStatuses = isApprover ? ['SUBMITTED'] : ['DRAFT'];
    const needsAction = invoices.filter(i => actionStatuses.includes(i.status));
    const needsActionTotal = needsAction.reduce((s, i) => s + i.total_amount, 0);

    // "Awaiting Payment" — approved but not paid
    const awaiting = invoices.filter(i => i.status === 'APPROVED');
    const awaitingTotal = awaiting.reduce((s, i) => s + i.total_amount, 0);
    const awaitingAges = awaiting.map(i => {
      const ref = i.approved_at || i.submitted_at || i.created_at;
      return differenceInDays(now, new Date(ref));
    });
    const avgAge = awaitingAges.length > 0
      ? Math.round(awaitingAges.reduce((a, b) => a + b, 0) / awaitingAges.length)
      : 0;

    // "Paid This Month"
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonth = invoices
      .filter(i => i.status === 'PAID' && i.paid_at && new Date(i.paid_at) >= monthStart)
      .reduce((s, i) => s + i.total_amount, 0);

    return { needsAction: needsAction.length, needsActionTotal, awaitingCount: awaiting.length, awaitingTotal, avgAge, paidThisMonth };
  }, [invoices, isApprover]);

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      {/* Needs Action */}
      <Card className="p-4 flex items-center gap-3 border-l-4 border-l-destructive/60">
        <div className="p-2 rounded-full bg-destructive/10 shrink-0">
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Needs Your Action
          </p>
          <p className="text-lg font-bold leading-tight">
            {metrics.needsAction} <span className="text-sm font-normal text-muted-foreground">({formatCurrency(metrics.needsActionTotal)})</span>
          </p>
        </div>
      </Card>

      {/* Awaiting Payment */}
      <Card className="p-4 flex items-center gap-3 border-l-4 border-l-primary/60">
        <div className="p-2 rounded-full bg-primary/10 shrink-0">
          <Clock className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Awaiting Payment
          </p>
          <p className="text-lg font-bold leading-tight">
            {metrics.awaitingCount} <span className="text-sm font-normal text-muted-foreground">({formatCurrency(metrics.awaitingTotal)})</span>
          </p>
          {metrics.awaitingCount > 0 && (
            <p className="text-xs text-muted-foreground">Avg {metrics.avgAge}d outstanding</p>
          )}
        </div>
      </Card>

      {/* Paid This Month */}
      <Card className="p-4 flex items-center gap-3 border-l-4 border-l-accent/60">
        <div className="p-2 rounded-full bg-accent/10 shrink-0">
          <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Paid This Month
          </p>
          <p className="text-lg font-bold leading-tight">
            {formatCurrency(metrics.paidThisMonth)}
          </p>
        </div>
      </Card>
    </div>
  );
}
