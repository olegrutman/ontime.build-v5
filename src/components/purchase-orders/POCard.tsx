import { format } from 'date-fns';
import { Eye, Edit, Download, Send, Loader2, Lock, Truck, Receipt, ClipboardList, CheckCircle, XCircle } from 'lucide-react';
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
  onApprove?: (po: PurchaseOrder) => Promise<void>;
  onReject?: (po: PurchaseOrder) => Promise<void>;
  canEdit?: boolean;
  canSubmit?: boolean;
  canViewPricing?: boolean;
  isSupplier?: boolean;
  isGC?: boolean;
  isInvoiced?: boolean;
  estimatePackTotal?: number | null;
  estimatePackItemCount?: number | null;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

const fmtFull = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);

export function POCard({
  po,
  onClick,
  onEdit,
  onDownload,
  onSubmit,
  onApprove,
  onReject,
  canEdit = false,
  canSubmit = false,
  canViewPricing = false,
  isGC = false,
  isInvoiced = false,
  estimatePackTotal = null,
}: POCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

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
      onClick: (e) => { e.stopPropagation(); onClick(); },
    },
    ...(onEdit && status === 'ACTIVE' && canEdit
      ? [{
          icon: <Edit className="h-4 w-4" />,
          label: 'Edit PO',
          onClick: (e: React.MouseEvent) => { e.stopPropagation(); onEdit(po); },
        }]
      : []),
    ...(onDownload
      ? [{
          icon: <Download className="h-4 w-4" />,
          label: 'Download PDF',
          onClick: (e: React.MouseEvent) => { e.stopPropagation(); onDownload(po); },
        }]
      : []),
  ];

  const showSubmitButton = canSubmit && status === 'ACTIVE' && onSubmit;
  const showEditButton = canEdit && status === 'ACTIVE' && onEdit;
  const showApprovalButtons = isGC && status === 'PENDING_APPROVAL' && onApprove;

  const lineItemCount = po.line_items?.length || 0;

  const subtotal = canViewPricing && po.line_items
    ? po.line_items.reduce((sum, item) => sum + (item.line_total || 0), 0)
    : null;
  const taxRate = (po.sales_tax_percent || 0) / 100;
  const total = subtotal !== null ? subtotal * (1 + taxRate) : null;

  const hasPricing = po.line_items?.some(item => item.unit_price !== null);

  const isFromEstimate = !!po.source_estimate_id;
  const poSubtotal = po.line_items
    ? po.line_items.reduce((sum, item) => sum + (item.line_total || 0), 0) * (1 + taxRate)
    : 0;
  const adjustment = estimatePackTotal != null ? poSubtotal - estimatePackTotal : null;

  return (
    <Card
      className="group cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
      data-sasha-card="Purchase Order"
    >
      <CardContent className="p-4">
        {/* Row 1: PO number + badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold truncate">{po.po_number}</span>
          <div className="flex items-center gap-1.5 shrink-0">
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

        {/* Row 2: Supplier · items · date */}
        <p className="text-sm text-muted-foreground mt-1 truncate">
          {po.supplier?.name || '—'}
          <span className="mx-1.5">·</span>
          {lineItemCount} item{lineItemCount !== 1 ? 's' : ''}
          <span className="mx-1.5">·</span>
          {format(new Date(po.created_at), 'MMM d, yyyy')}
        </p>

        {/* Estimate origin */}
        {isFromEstimate && (
          <div className="mt-3 space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-transparent text-[11px] px-1.5 py-0">
                <ClipboardList className="h-3 w-3 mr-0.5" />
                Estimate
              </Badge>
              {po.source_pack_name && (
                <span className="text-xs text-muted-foreground truncate">
                  {po.source_pack_name}
                </span>
              )}
            </div>

            {canViewPricing && estimatePackTotal != null && (
              <p className="text-xs text-muted-foreground">
                Est {fmt(estimatePackTotal)}
                <span className="mx-1">→</span>
                <span className="font-medium text-foreground">{fmt(poSubtotal)}</span>
                {adjustment != null && adjustment !== 0 && (
                  <span className={`ml-1 ${adjustment > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                    ({adjustment > 0 ? '+' : ''}{fmt(adjustment)})
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Total */}
        {hasPricing && (
          <div className="mt-3">
            {canViewPricing ? (
              <div className="flex items-center justify-end gap-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="font-bold text-lg">{fmtFull(total || 0)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                <span className="text-sm">Pricing managed by another party</span>
              </div>
            )}
          </div>
        )}

        {/* Delivery tracking */}
        {po.delivered_at && (
          <div className="mt-3 pt-3 border-t text-sm">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="h-3.5 w-3.5 text-green-600" />
                Delivered
              </span>
              <span className="font-medium text-green-600">{format(new Date(po.delivered_at), 'MMM d')}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {(showSubmitButton || showEditButton || showApprovalButtons) && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            {showEditButton && (
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit!(po); }}>
                <Edit className="h-3.5 w-3.5 mr-1.5" />
                Edit
              </Button>
            )}
            {showSubmitButton && (
              <Button size="sm" onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Submit to Supplier
              </Button>
            )}
            {showApprovalButtons && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    onReject?.(po);
                  }}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={async (e) => {
                    e.stopPropagation();
                    setApproving(true);
                    try { await onApprove!(po); } finally { setApproving(false); }
                  }}
                  disabled={approving}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {approving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
                  Approve & Send
                </Button>
              </>
            )}
          </div>
        )}

        {/* Work item ref */}
        {po.work_item && (
          <p className="mt-3 pt-2 border-t text-sm text-muted-foreground">
            Work Order: {po.work_item.title}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
