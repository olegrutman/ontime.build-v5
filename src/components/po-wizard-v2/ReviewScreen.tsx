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
} from 'lucide-react';
import { format } from 'date-fns';
import { POWizardV2Data } from '@/types/poWizardV2';

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
              {data.line_items.map((item, idx) => (
                <div key={item.id} className="flex items-start gap-3">
                  <span className="text-sm text-muted-foreground w-5">{idx + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.specs}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {item.is_engineered && item.length_ft
                      ? `${item.quantity} pcs @ ${item.length_ft}' = ${item.computed_lf} LF`
                      : `${item.quantity} ${item.unit_mode === 'BUNDLE' ? item.bundle_name || 'BDL' : item.uom}`
                    }
                  </Badge>
                </div>
              ))}
            </div>
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
