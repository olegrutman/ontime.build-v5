import { useMemo } from 'react';
import { AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PurchaseOrder } from '@/types/purchaseOrder';
import { formatCurrency } from '@/lib/utils';

interface POActionBarProps {
  purchaseOrders: PurchaseOrder[];
  isSupplier: boolean;
  hidePricing?: boolean;
}

export function POActionBar({ purchaseOrders, isSupplier, hidePricing = false }: POActionBarProps) {
  const metrics = useMemo(() => {
    const now = new Date();

    // "Needs Action" — for TC/GC: ACTIVE (drafts to finish). For Supplier: SUBMITTED (needs pricing).
    const actionStatuses = isSupplier ? ['SUBMITTED'] : ['ACTIVE'];
    const needsAction = purchaseOrders.filter(po => actionStatuses.includes(po.status));
    const needsActionTotal = needsAction.reduce((s, po) => s + (po.po_total || 0), 0);

    // "Awaiting Delivery" — ORDERED status
    const awaiting = purchaseOrders.filter(po => po.status === 'ORDERED');
    const awaitingTotal = awaiting.reduce((s, po) => s + (po.po_total || 0), 0);

    // "Delivered This Month"
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

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
      {/* Needs Action */}
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

      {/* Awaiting Delivery */}
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

      {/* Delivered This Month */}
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
