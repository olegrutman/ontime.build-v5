import { format } from 'date-fns';
import { FileText, Calendar, DollarSign, Eye, Edit, Download, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { Invoice, InvoiceStatus } from '@/types/invoice';
import { HoverActions, HoverAction } from '@/components/ui/hover-actions';
import { StatusColumn, INVOICE_STATUS_OPTIONS } from '@/components/ui/status-column';
import { useState } from 'react';

interface InvoiceCardProps {
  invoice: Invoice;
  onClick: () => void;
  onEdit?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  onSubmit?: (invoice: Invoice) => Promise<void>;
  onApprove?: (invoice: Invoice) => Promise<void>;
  onReject?: (invoice: Invoice) => Promise<void>;
  canSubmit?: boolean;
  canApprove?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function InvoiceCard({ 
  invoice, 
  onClick, 
  onEdit, 
  onDownload, 
  onSubmit,
  onApprove,
  onReject,
  canSubmit = false,
  canApprove = false,
}: InvoiceCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(invoice);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onApprove) return;
    setApproving(true);
    try {
      await onApprove(invoice);
    } finally {
      setApproving(false);
    }
  };

  const hoverActions: HoverAction[] = [
    {
      icon: <Eye className="h-4 w-4" />,
      label: 'View Details',
      onClick: (e) => {
        e.stopPropagation();
        onClick();
      },
    },
    ...(onEdit && invoice.status === 'DRAFT' ? [{
      icon: <Edit className="h-4 w-4" />,
      label: 'Edit Invoice',
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(invoice);
      },
    }] : []),
    ...(onDownload ? [{
      icon: <Download className="h-4 w-4" />,
      label: 'Download PDF',
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onDownload(invoice);
      },
    }] : []),
  ];

  // Show action buttons based on status and permissions
  const showSubmitButton = canSubmit && invoice.status === 'DRAFT' && onSubmit;
  const showEditButton = canSubmit && invoice.status === 'DRAFT' && onEdit;
  const showApproveButton = canApprove && invoice.status === 'SUBMITTED' && onApprove;

  return (
    <Card
      className="group cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{invoice.invoice_number}</h4>
              <p className="text-sm text-muted-foreground">
                {format(new Date(invoice.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <HoverActions actions={hoverActions} />
            <StatusColumn
              value={invoice.status}
              options={INVOICE_STATUS_OPTIONS}
              size="sm"
              disabled
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Billing Period</p>
              <p className="font-medium">
                {format(new Date(invoice.billing_period_start), 'MMM d')} -{' '}
                {format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Amount Due</p>
              <p className="font-bold">{formatCurrency(invoice.total_amount)}</p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        {(showSubmitButton || showEditButton || showApproveButton) && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            {showEditButton && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit!(invoice);
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
                Submit
              </Button>
            )}
            {showApproveButton && (
              <Button
                size="sm"
                onClick={handleApprove}
                disabled={approving}
                className="bg-green-600 hover:bg-green-700"
              >
                {approving ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                )}
                Approve
              </Button>
            )}
          </div>
        )}

        {invoice.rejection_reason && invoice.status === 'REJECTED' && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
            <strong>Rejection:</strong> {invoice.rejection_reason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
