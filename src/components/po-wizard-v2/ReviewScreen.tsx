import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ChevronLeft, 
  Plus,
  Loader2,
  Send,
  Package,
  Building2,
  CalendarDays,
  Clock,
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
  }).format(amount);
}

interface ReviewScreenProps {
  data: POWizardV2Data;
  onAddMore: () => void;
  onEditItems: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function ReviewScreen({
  data,
  onAddMore,
  onEditItems,
  onBack,
  onSubmit,
  isSubmitting,
}: ReviewScreenProps) {
  // Compute totals
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
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background">
        <span className="text-xs uppercase tracking-wide font-medium text-muted-foreground">
          Step 3 of 3
        </span>
        <h2 className="text-lg font-semibold mt-1">Review Purchase Order</h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Summary Card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Project */}
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Project</p>
                <p className="font-medium">{data.project_name}</p>
              </div>
            </div>

            <Separator />

            {/* Supplier */}
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Supplier</p>
                <p className="font-medium">{data.supplier_name}</p>
              </div>
            </div>

            <Separator />

            {/* Delivery */}
            <div className="flex items-start gap-3">
              <CalendarDays className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Delivery</p>
                <p className="font-medium">
                  {data.requested_delivery_date 
                    ? format(data.requested_delivery_date, 'PPP')
                    : 'Not set'
                  }
                </p>
              </div>
            </div>

            <Separator />

            {/* Delivery Window */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Window</p>
                <Badge variant="outline">{data.delivery_window}</Badge>
              </div>
            </div>

            {data.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm">{data.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Items Card */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-medium">Items</h3>
                <Badge variant="secondary">{data.line_items.length}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={onEditItems}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </div>

            <div className="space-y-3">
              {data.line_items.map((item, idx) => {
                const lineTotal = item.unit_price != null ? item.quantity * item.unit_price : null;
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <span className="text-sm text-muted-foreground w-5">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.specs}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>
                          {item.unit_price != null
                            ? `${formatCurrency(item.unit_price)} / ${item.uom}`
                            : `-- / ${item.uom}`}
                        </span>
                        <span className="font-medium text-foreground">
                          {lineTotal != null ? formatCurrency(lineTotal) : '--'}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {item.is_engineered && item.length_ft
                        ? `${item.quantity} pcs @ ${item.length_ft}' = ${item.computed_lf} LF`
                        : `${item.quantity} ${item.unit_mode === 'BUNDLE' ? item.bundle_name || 'BDL' : item.uom}`
                      }
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Totals Card */}
        <Card>
          <CardContent className="p-4 space-y-2 text-sm">
            <h3 className="font-medium mb-2">Totals</h3>
            {totals.estimateSubtotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (Estimate Items)</span>
                <span>{formatCurrency(totals.estimateSubtotal)}</span>
              </div>
            )}
            {totals.additionalSubtotal > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (Additional Items)</span>
                <span>{formatCurrency(totals.additionalSubtotal)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>{totals.unpricedCount > 0 ? 'Total (Pending Pricing)' : 'Total'}</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.unpricedCount > 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs mt-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{totals.unpricedCount} item{totals.unpricedCount !== 1 ? 's' : ''} need supplier pricing to finalize total</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sticky Footer */}
      <div className="p-4 border-t bg-background space-y-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-12"
            onClick={onBack}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            className="h-12"
            onClick={onAddMore}
          >
            <Plus className="h-5 w-5 mr-1" />
            Add More
          </Button>
          <Button
            className="flex-1 h-12"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Submit PO
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
