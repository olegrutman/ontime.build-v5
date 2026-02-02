import { format } from 'date-fns';
import { Package, Eye, Edit, Download, Send, Loader2, Building2, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  isSupplier?: boolean;
}

export function POCard({
  po,
  onClick,
  onEdit,
  onDownload,
  onSubmit,
  canEdit = false,
  canSubmit = false,
  isSupplier = false,
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

  return (
    <Card
      className="group cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Package className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{po.po_number}</h4>
              <p className="text-xs text-muted-foreground">
                {format(new Date(po.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HoverActions actions={hoverActions} />
            <POStatusBadge status={status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Supplier</p>
              <p className="font-medium truncate">{po.supplier?.name || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Items</p>
              <p className="font-medium">{lineItemCount} line item{lineItemCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

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
          <div className="mt-3 pt-2 border-t text-xs text-muted-foreground">
            Work Order: {po.work_item.title}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
