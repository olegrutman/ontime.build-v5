import { useMemo } from 'react';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PurchaseOrder } from '@/types/purchaseOrder';
import { formatCurrency } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface POActionBarProps {
  purchaseOrders: PurchaseOrder[];
  isSupplier: boolean;
  hidePricing?: boolean;
}

export function POActionBar({ purchaseOrders, isSupplier, hidePricing = false }: POActionBarProps) {
  const isMobile = useIsMobile();

  const metrics = useMemo(() => {
    const now = new Date();
    const actionStatuses = isSupplier ? ['SUBMITTED'] : ['ACTIVE'];
    const needsAction = purchaseOrders.filter(po => actionStatuses.includes(po.status));
    const needsActionTotal = needsAction.reduce((s, po) => s + (po.po_total || 0), 0);

    const awaiting = purchaseOrders.filter(po => po.status === 'ORDERED');
    const awaitingTotal = awaiting.reduce((s, po) => s + (po.po_total || 0), 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const deliveredThisMonth = purchaseOrders
      .filter(po => po.status === 'DELIVERED' && po.delivered_at && new Date(po.delivered_at) >= monthStart);
    const deliveredTotal = deliveredThisMonth.reduce((s, po) => s + (po.po_total || 0), 0);

    return {
      needsAction: needsAction.length,
      needsActionTotal,
      awaitingCount: awaiting.length,
      awaitingTotal,
      deliveredCount: deliveredThisMonth.length,
      deliveredTotal,
    };
  }, [purchaseOrders, isSupplier]);

  // Mobile: compact horizontal scroll row
  if (isMobile) {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <Card className="p-2.5 flex items-center gap-2 border-l-2 border-l-destructive/60 shrink-0 min-w-0">
          <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">
              {isSupplier ? 'Pricing' : 'Action'}
            </p>
            <p className="text-sm font-bold leading-tight">
              {metrics.needsAction}
              {!hidePricing && (
                <span className="text-[10px] font-normal text-muted-foreground"> ({formatCurrency(metrics.needsActionTotal)})</span>
              )}
            </p>
          </div>
        </Card>

        <Card className="p-2.5 flex items-center gap-2 border-l-2 border-l-primary/60 shrink-0 min-w-0">
          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">Delivery</p>
            <p className="text-sm font-bold leading-tight">
              {metrics.awaitingCount}
              {!hidePricing && (
                <span className="text-[10px] font-normal text-muted-foreground"> ({formatCurrency(metrics.awaitingTotal)})</span>
              )}
            </p>
          </div>
        </Card>

        <Card className="p-2.5 flex items-center gap-2 border-l-2 border-l-accent/60 shrink-0 min-w-0">
          <CheckCircle2 className="h-3.5 w-3.5 text-accent-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-tight">Delivered</p>
            <p className="text-sm font-bold leading-tight">
              {hidePricing ? metrics.deliveredCount : formatCurrency(metrics.deliveredTotal)}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Desktop
  return (
    <div className="grid gap-3 grid-cols-3">
      <Card className="p-4 flex items-center gap-3 border-l-4 border-l-destructive/60">
        <div className="p-2 rounded-full bg-destructive/10 shrink-0">
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {isSupplier ? 'Needs Pricing' : 'Needs Your Action'}
          </p>
          <p className="text-lg font-bold leading-tight">
            {metrics.needsAction}
            {!hidePricing && (
              <span className="text-sm font-normal text-muted-foreground">
                {' '}({formatCurrency(metrics.needsActionTotal)})
              </span>
            )}
          </p>
        </div>
      </Card>

      <Card className="p-4 flex items-center gap-3 border-l-4 border-l-primary/60">
        <div className="p-2 rounded-full bg-primary/10 shrink-0">
          <Clock className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Awaiting Delivery
          </p>
          <p className="text-lg font-bold leading-tight">
            {metrics.awaitingCount}
            {!hidePricing && (
              <span className="text-sm font-normal text-muted-foreground">
                {' '}({formatCurrency(metrics.awaitingTotal)})
              </span>
            )}
          </p>
        </div>
      </Card>

      <Card className="p-4 flex items-center gap-3 border-l-4 border-l-accent/60">
        <div className="p-2 rounded-full bg-accent/10 shrink-0">
          <CheckCircle2 className="h-4 w-4 text-accent-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Delivered This Month
          </p>
          <p className="text-lg font-bold leading-tight">
            {hidePricing ? metrics.deliveredCount : formatCurrency(metrics.deliveredTotal)}
          </p>
        </div>
      </Card>
    </div>
  );
}
