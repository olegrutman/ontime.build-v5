import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  Plus,
  Loader2,
  Send,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { POWizardV2Data } from '@/types/poWizardV2';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface ReviewScreenProps {
  data: POWizardV2Data;
  onAddMore: () => void;
  onEditItems: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  hidePricing?: boolean;
}

export function ReviewScreen({
  data,
  onAddMore,
  onEditItems,
  onBack,
  onSubmit,
  isSubmitting,
  hidePricing = false,
}: ReviewScreenProps) {
  const totals = useMemo(() => {
    let estimateSubtotal = 0;
    let additionalSubtotal = 0;
    let unpricedCount = 0;

    for (const item of data.line_items) {
      const lineTotal = item.unit_price != null ? item.quantity * item.unit_price : null;
      if (item.source_estimate_item_id) {
        estimateSubtotal += lineTotal ?? 0;
      } else if (item.unit_price != null) {
        additionalSubtotal += lineTotal ?? 0;
      }
      if (item.unit_price == null) {
        unpricedCount++;
      }
    }

    const subtotal = estimateSubtotal + additionalSubtotal;
    return { estimateSubtotal, additionalSubtotal, subtotal, unpricedCount };
  }, [data.line_items]);

  return (
    <div className="flex flex-col h-full">
      {/* Q-Header */}
      <div className="wz-q-header">
        <span className="wz-q-label">Step 3 of 3</span>
        <h2 className="wz-q-title">Review Order</h2>
        <p className="wz-q-sub">Confirm details before submitting</p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
        {/* Delivery Details Block */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold tracking-wide uppercase text-muted-foreground">Delivery Details</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Project</span>
              <span className="font-medium text-right truncate ml-4">{data.project_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Supplier</span>
              <span className="font-medium">{data.supplier_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery</span>
              <span className="font-medium">
                {data.requested_delivery_date
                  ? format(data.requested_delivery_date, 'PPP')
                  : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Window</span>
              <span className="font-medium">{data.delivery_window}</span>
            </div>
            {data.notes && (
              <div className="pt-1">
                <span className="text-muted-foreground">Notes</span>
                <p className="text-sm mt-0.5">{data.notes}</p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Items Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold tracking-wide uppercase text-muted-foreground">
              Items ({data.line_items.length})
            </h3>
            <button className="text-xs font-medium text-primary flex items-center gap-1" onClick={onEditItems}>
              <Pencil className="h-3 w-3" /> Edit
            </button>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                 <tr className="bg-muted/50 text-xs text-muted-foreground">
                   <th className="text-left py-2 px-3 font-medium">Item</th>
                   <th className="text-center py-2 px-2 font-medium w-14">Qty</th>
                   {!hidePricing && <th className="text-right py-2 px-3 font-medium w-20">Total</th>}
                 </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.line_items.map((item) => {
                  const lineTotal = item.unit_price != null ? item.quantity * item.unit_price : null;
                  return (
                    <tr key={item.id}>
                      <td className="py-2.5 px-3">
                        <p className="font-medium truncate max-w-[200px]">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.specs}</p>
                      </td>
                      <td className="py-2.5 px-2 text-center text-muted-foreground">
                        {item.is_engineered && item.length_ft
                          ? `${item.computed_lf} LF`
                          : `${item.quantity} ${item.uom}`}
                      </td>
                      <td className="py-2.5 px-3 text-right font-medium">
                        {!hidePricing && (lineTotal != null ? formatCurrency(lineTotal) : '—')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="wz-totals-bar space-y-1">
          {totals.estimateSubtotal > 0 && (
            <div className="flex justify-between text-sm text-secondary-foreground/70">
              <span>Estimate Items</span>
              <span>{formatCurrency(totals.estimateSubtotal)}</span>
            </div>
          )}
          {totals.additionalSubtotal > 0 && (
            <div className="flex justify-between text-sm text-secondary-foreground/70">
              <span>Additional Items</span>
              <span>{formatCurrency(totals.additionalSubtotal)}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline">
            <span className="text-sm font-medium text-secondary-foreground">
              {totals.unpricedCount > 0 ? 'Total (Pending)' : 'Total'}
            </span>
            <span className="wz-totals-value">{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.unpricedCount > 0 && (
            <div className="flex items-center gap-1.5 text-primary text-xs pt-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{totals.unpricedCount} item{totals.unpricedCount !== 1 ? 's' : ''} need supplier pricing</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="wz-footer flex gap-2">
        <Button variant="ghost" className="h-11" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button variant="outline" className="h-11" onClick={onAddMore}>
          <Plus className="h-4 w-4 mr-1" />
          Add More
        </Button>
        <Button className="flex-1 h-11" onClick={onSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Submit PO
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
