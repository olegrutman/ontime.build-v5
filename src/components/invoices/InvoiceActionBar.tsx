import { useMemo } from 'react';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Invoice } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils';
import { differenceInDays } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

interface InvoiceActionBarProps {
  invoices: Invoice[];
  /** true when the viewer is the approver side */
  isApprover: boolean;
}

export function InvoiceActionBar({ invoices, isApprover }: InvoiceActionBarProps) {
  const isMobile = useIsMobile();

  const metrics = useMemo(() => {
    const now = new Date();

    const actionStatuses = isApprover ? ['SUBMITTED'] : ['DRAFT'];
    const needsAction = invoices.filter(i => actionStatuses.includes(i.status));
    const needsActionTotal = needsAction.reduce((s, i) => s + i.total_amount, 0);

    const awaiting = invoices.filter(i => i.status === 'APPROVED');
    const awaitingTotal = awaiting.reduce((s, i) => s + i.total_amount, 0);
    const awaitingAges = awaiting.map(i => {
      const ref = i.approved_at || i.submitted_at || i.created_at;
      return differenceInDays(now, new Date(ref));
    });
    const avgAge = awaitingAges.length > 0
      ? Math.round(awaitingAges.reduce((a, b) => a + b, 0) / awaitingAges.length)
      : 0;

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const paidThisMonth = invoices
      .filter(i => i.status === 'PAID' && i.paid_at && new Date(i.paid_at) >= monthStart)
      .reduce((s, i) => s + i.total_amount, 0);

    return { needsAction: needsAction.length, needsActionTotal, awaitingCount: awaiting.length, awaitingTotal, avgAge, paidThisMonth };
  }, [invoices, isApprover]);

  // Mobile: compact horizontal scroll row
  if (isMobile) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <Card className="p-2.5 flex items-center gap-2 border-l-2 border-l-destructive/60 shrink-0 min-w-0">
          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">Action</p>
            <p className="text-sm font-bold leading-tight">
              {metrics.needsAction} <span className="text-[10px] font-normal text-muted-foreground">({formatCurrency(metrics.needsActionTotal)})</span>
            </p>
          </div>
        </Card>

        <Card className="p-2.5 flex items-center gap-2 border-l-2 border-l-primary/60 shrink-0 min-w-0">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">Awaiting</p>
            <p className="text-sm font-bold leading-tight">
              {metrics.awaitingCount} <span className="text-[10px] font-normal text-muted-foreground">({formatCurrency(metrics.awaitingTotal)})</span>
            </p>
          </div>
        </Card>

        <Card className="p-2.5 flex items-center gap-2 border-l-2 border-l-accent/60 shrink-0 min-w-0">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">Paid</p>
            <p className="text-sm font-bold leading-tight">{formatCurrency(metrics.paidThisMonth)}</p>
          </div>
        </Card>
      </div>
    );
  }

  // Desktop: original 3-column grid
  return (
    <div className="grid gap-3 grid-cols-3">
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
