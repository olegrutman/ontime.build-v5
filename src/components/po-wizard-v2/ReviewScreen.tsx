import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft, 
  Plus,
  Loader2,
  Send,
  Pencil,
  AlertTriangle,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
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
  onCreateAndSend?: () => void;
  isSubmitting: boolean;
  isSending?: boolean;
  hidePricing?: boolean;
  onTaxChange?: (tax: number) => void;
  onDeliveryChange?: (updates: Partial<POWizardV2Data>) => void;
}

export function ReviewScreen({
  data,
  onAddMore,
  onEditItems,
  onBack,
  onSubmit,
  onCreateAndSend,
  isSubmitting,
  isSending = false,
  hidePricing = false,
  onTaxChange,
  onDeliveryChange,
}: ReviewScreenProps) {
  const [editingTax, setEditingTax] = useState(false);
  const [taxInput, setTaxInput] = useState('');
  const [editingDelivery, setEditingDelivery] = useState(false);

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
    const taxPercent = data.sales_tax_percent ?? 0;
    const taxAmount = subtotal * (taxPercent / 100);
    const grandTotal = subtotal + taxAmount;
    return { estimateSubtotal, additionalSubtotal, subtotal, unpricedCount, taxPercent, taxAmount, grandTotal };
  }, [data.line_items, data.sales_tax_percent]);

  const handleTaxEdit = () => {
    setTaxInput(String(totals.taxPercent));
    setEditingTax(true);
  };

  const handleTaxSave = () => {
    const parsed = parseFloat(taxInput);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      onTaxChange?.(parsed);
    }
    setEditingTax(false);
  };

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
        {/* Delivery Details Block — inline editable */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold tracking-wide uppercase text-muted-foreground">Delivery Details</h3>
            <button
              className="text-xs font-medium text-primary flex items-center gap-1"
              onClick={() => setEditingDelivery(!editingDelivery)}
            >
              {editingDelivery ? (
                <>
                  <ChevronUp className="h-3 w-3" /> Done
                </>
              ) : (
                <>
                  <Pencil className="h-3 w-3" /> Edit
                </>
              )}
            </button>
          </div>

          {editingDelivery ? (
            <div className="space-y-4 rounded-lg border p-3 bg-muted/20">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Project</span>
                  <span className="font-medium text-right truncate ml-4">{data.project_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Supplier</span>
                  <span className="font-medium">{data.supplier_name}</span>
                </div>
              </div>

              <Separator />

              {/* Delivery Date */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Delivery Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-11 justify-start text-left font-normal',
                        !data.requested_delivery_date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                      {data.requested_delivery_date
                        ? format(data.requested_delivery_date, 'PPP')
                        : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={data.requested_delivery_date || undefined}
                      onSelect={(date) => onDeliveryChange?.({ requested_delivery_date: date || null })}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Delivery Window */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Delivery Window
                </Label>
                <div className="flex gap-2">
                  {(['AM', 'PM', 'ANY'] as const).map((window) => (
                    <button
                      key={window}
                      className={`wz-pill flex-1 ${data.delivery_window === window ? 'wz-pill--active' : 'wz-pill--inactive'}`}
                      onClick={() => onDeliveryChange?.({ delivery_window: window })}
                    >
                      {window === 'ANY' ? 'Any' : window}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                  Notes
                </Label>
                <Textarea
                  placeholder="Delivery instructions, gate codes, etc."
                  value={data.notes}
                  onChange={(e) => onDeliveryChange?.({ notes: e.target.value })}
                  className="min-h-[72px] resize-none text-sm"
                />
              </div>
            </div>
          ) : (
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
          )}
        </div>

        <Separator />

        {/* Items Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold tracking-wide uppercase text-muted-foreground">
              Items ({data.line_items.length})
            </h3>
            <div className="flex items-center gap-2">
              <button className="text-xs font-medium text-primary flex items-center gap-1" onClick={onAddMore}>
                <Plus className="h-3 w-3" /> Add
              </button>
              <button className="text-xs font-medium text-primary flex items-center gap-1" onClick={onEditItems}>
                <Pencil className="h-3 w-3" /> Edit
              </button>
            </div>
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
                      {!hidePricing && (
                        <td className="py-2.5 px-3 text-right font-medium">
                          {lineTotal != null ? formatCurrency(lineTotal) : '—'}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        {!hidePricing && (
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
            <div className="flex justify-between text-sm text-secondary-foreground/70">
              <span>Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>

            {/* Tax line — editable */}
            <div className="flex justify-between items-center text-sm text-secondary-foreground/70">
              {editingTax ? (
                <div className="flex items-center gap-1">
                  <span>Tax</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxInput}
                    onChange={(e) => setTaxInput(e.target.value)}
                    onBlur={handleTaxSave}
                    onKeyDown={(e) => e.key === 'Enter' && handleTaxSave()}
                    className="h-6 w-16 text-xs px-1"
                    autoFocus
                  />
                  <span>%</span>
                </div>
              ) : (
                <button
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                  onClick={handleTaxEdit}
                >
                  <span>Tax ({totals.taxPercent}%)</span>
                  <Pencil className="h-2.5 w-2.5" />
                </button>
              )}
              <span>{formatCurrency(totals.taxAmount)}</span>
            </div>

            {/* Grand Total */}
            <div className="flex justify-between items-baseline pt-1 border-t border-border/50">
              <span className="text-sm font-medium text-secondary-foreground">
                {totals.unpricedCount > 0 ? 'Total (Pending)' : 'Total'}
              </span>
              <span className="wz-totals-value">{formatCurrency(totals.grandTotal)}</span>
            </div>
            {totals.unpricedCount > 0 && (
              <div className="flex items-center gap-1.5 text-primary text-xs pt-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{totals.unpricedCount} item{totals.unpricedCount !== 1 ? 's' : ''} need supplier pricing</span>
              </div>
            )}
            {totals.taxPercent === 0 && (
              <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 text-xs pt-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>No tax rate set — tap to edit</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="wz-footer flex gap-2">
        <Button variant="ghost" className="h-11 shrink-0" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button variant="outline" className="flex-1 h-11" onClick={onSubmit} disabled={isSubmitting || isSending}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Create PO'
          )}
        </Button>
        {onCreateAndSend && (
          <Button className="flex-1 h-11" onClick={onCreateAndSend} disabled={isSubmitting || isSending}>
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create & Send
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
