import { format } from 'date-fns';
import { Package, Eye, Edit, Download, Send, Loader2, Building2, FileText, DollarSign, Lock, PackageCheck, Truck, Receipt, ClipboardList, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { POStatusBadge } from './POStatusBadge';
import { PurchaseOrder, POStatus } from '@/types/purchaseOrder';
import { HoverActions, HoverAction } from '@/components/ui/hover-actions';
import { useState } from 'react';

interface POCardProps {
  po: PurchaseOrder;
  onClick: () => void;
  onEdit?: (po: PurchaseOrder) => void;
  onDownload?: (po: PurchaseOrder) => void;
  onSubmit?: (po: PurchaseOrder) => Promise<void>;
  canEdit?: boolean;
  canSubmit?: boolean;
  canViewPricing?: boolean;
  isSupplier?: boolean;
  isInvoiced?: boolean;
}

export function POCard({
  po,
  onClick,
  onEdit,
  onDownload,
  onSubmit,
  canEdit = false,
  canSubmit = false,
  canViewPricing = false,
  isSupplier = false,
  isInvoiced = false,
}: POCardProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(po);
    } finally {
      setSubmitting(false);
    }
  };

  const status = po.status as POStatus;

  const hoverActions: HoverAction[] = [
    {
      icon: <Eye className="h-4 w-4" />,
      label: 'View Details',
      onClick: (e) => {
        e.stopPropagation();
        onClick();
      },
    },
    ...(onEdit && status === 'ACTIVE' && canEdit
      ? [
          {
            icon: <Edit className="h-4 w-4" />,
            label: 'Edit PO',
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onEdit(po);
            },
          },
        ]
      : []),
    ...(onDownload
      ? [
          {
            icon: <Download className="h-4 w-4" />,
            label: 'Download PDF',
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onDownload(po);
            },
          },
        ]
      : []),
  ];

  const showSubmitButton = canSubmit && status === 'ACTIVE' && onSubmit;
  const showEditButton = canEdit && status === 'ACTIVE' && onEdit;

  const lineItemCount = po.line_items?.length || 0;
  
  // Calculate total from line items if user can view pricing
  const subtotal = canViewPricing && po.line_items 
    ? po.line_items.reduce((sum, item) => sum + (item.line_total || 0), 0)
    : null;
  const taxRate = (po.sales_tax_percent || 0) / 100;
  const total = subtotal !== null ? subtotal * (1 + taxRate) : null;
  
  const hasPricing = po.line_items?.some(item => item.unit_price !== null);

  // Estimate/pack origin calculations
  const isFromEstimate = !!po.source_estimate_id;
  const estimateItems = po.line_items?.filter(item => item.source_estimate_item_id) || [];
  const estimateItemCount = estimateItems.length;
  const addedItemCount = lineItemCount - estimateItemCount;
  
  const originalTotal = estimateItems.reduce((sum, item) => {
    if (item.original_unit_price != null && item.quantity != null) {
      return sum + item.original_unit_price * item.quantity;
    }
    return sum;
  }, 0);
  const finalTotal = estimateItems.reduce((sum, item) => sum + (item.line_total || 0), 0);
  const adjustment = finalTotal - originalTotal;
  const hasOriginalPricing = estimateItems.some(item => item.original_unit_price != null);

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{po.po_number}</h4>
              <p className="text-sm text-muted-foreground">
                {format(new Date(po.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HoverActions actions={hoverActions} />
            {isInvoiced && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Receipt className="h-3 w-3" />
                Invoiced
              </span>
            )}
            <POStatusBadge status={status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">Supplier</p>
              <p className="font-medium truncate">{po.supplier?.name || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="font-medium">{lineItemCount} line item{lineItemCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Estimate/Pack Origin Info */}
        {isFromEstimate && (
          <div className="mt-3 pt-3 border-t space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-transparent text-xs">
                <ClipboardList className="h-3 w-3 mr-1" />
                From Estimate
              </Badge>
              {po.source_pack_name && (
                <span className="text-xs text-muted-foreground font-medium">
                  Pack: {po.source_pack_name}
                </span>
              )}
            </div>

            {canViewPricing && hasOriginalPricing && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-muted-foreground">
                  Est: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(originalTotal)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="font-medium">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(finalTotal)}
                </span>
                {adjustment !== 0 && (
                  <span className={adjustment > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    ({adjustment > 0 ? '+' : ''}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(adjustment)})
                  </span>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              {addedItemCount > 0
                ? `${estimateItemCount} est items + ${addedItemCount} added`
                : `${estimateItemCount} est items`}
            </div>
          </div>
        )}

        {/* Pricing Display - Only if user can view pricing */}
        {hasPricing && (
          <div className="mt-3 pt-3 border-t">
            {canViewPricing ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm">Total</span>
                </div>
                <span className="font-bold text-lg">
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                  }).format(total || 0)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-sm">Pricing managed by another party</span>
              </div>
            )}
          </div>
        )}

        {/* Delivery Tracking - Show for READY_FOR_DELIVERY and DELIVERED statuses */}
        {(po.ready_for_delivery_at || po.delivered_at) && (
          <div className="mt-3 pt-3 border-t space-y-2">
            {po.ready_for_delivery_at && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <PackageCheck className="h-4 w-4 text-cyan-600" />
                  <span>Ready for Delivery</span>
                </div>
                <span className="font-medium">
                  {format(new Date(po.ready_for_delivery_at), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {po.delivered_at && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4 text-green-600" />
                  <span>Delivered</span>
                </div>
                <span className="font-medium text-green-600">
                  {format(new Date(po.delivered_at), 'MMM d, yyyy')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Quick Action Buttons */}
        {(showSubmitButton || showEditButton) && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            {showEditButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit!(po);
                }}
              >
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
            {showSubmitButton && (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                Submit to Supplier
              </Button>
            )}
          </div>
        )}

        {/* Work Item reference */}
        {po.work_item && (
          <div className="mt-3 pt-2 border-t text-sm text-muted-foreground">
            Work Order: {po.work_item.title}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
