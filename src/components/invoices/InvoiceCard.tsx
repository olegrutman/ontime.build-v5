import { format, differenceInDays } from 'date-fns';
import { Calendar, DollarSign, Eye, Edit, Download, Send, CheckCircle, Loader2, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Invoice, InvoiceStatus } from '@/types/invoice';
import { HoverActions, HoverAction } from '@/components/ui/hover-actions';
import { StatusColumn, INVOICE_STATUS_OPTIONS } from '@/components/ui/status-column';
import { useState } from 'react';
import { DT, STATUS_ACCENTS } from '@/lib/design-tokens';

interface InvoiceCardProps {
  invoice: Invoice;
  onClick: () => void;
  onEdit?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
  onSubmit?: (invoice: Invoice) => Promise<void>;
  onApprove?: (invoice: Invoice) => Promise<void>;
  onReject?: (invoice: Invoice) => Promise<void>;
  onDelete?: (invoice: Invoice) => Promise<void>;
  canSubmit?: boolean;
  canApprove?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getAccent(status: string): string {
  return STATUS_ACCENTS[status as keyof typeof STATUS_ACCENTS] || '#6B7280';
}

function InvoiceAgeBadge({ invoice }: { invoice: Invoice }) {
  if (invoice.status === 'DRAFT' || invoice.status === 'PAID') return null;
  const ref = invoice.status === 'APPROVED'
    ? (invoice.approved_at || invoice.submitted_at || invoice.created_at)
    : (invoice.submitted_at || invoice.created_at);
  const days = differenceInDays(new Date(), new Date(ref));
  const colors = days <= 14
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
    : days <= 30
    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  return <Badge className={cn('text-xs', colors)} style={DT.mono}>{days}d</Badge>;
}

export function InvoiceCard({ 
  invoice, onClick, onEdit, onDownload, onSubmit, onApprove, onReject, onDelete,
  canSubmit = false, canApprove = false,
}: InvoiceCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [approving, setApproving] = useState(false);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSubmit) return;
    setSubmitting(true);
    try { await onSubmit(invoice); } finally { setSubmitting(false); }
  };

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onApprove) return;
    setApproving(true);
    try { await onApprove(invoice); } finally { setApproving(false); }
  };

  const hoverActions: HoverAction[] = [
    { icon: <Eye className="h-4 w-4" />, label: 'View Details', onClick: (e) => { e.stopPropagation(); onClick(); } },
    ...(onEdit && invoice.status === 'DRAFT' ? [{ icon: <Edit className="h-4 w-4" />, label: 'Edit Invoice', onClick: (e: React.MouseEvent) => { e.stopPropagation(); onEdit(invoice); } }] : []),
    ...(onDownload ? [{ icon: <Download className="h-4 w-4" />, label: 'Download PDF', onClick: (e: React.MouseEvent) => { e.stopPropagation(); onDownload(invoice); } }] : []),
    ...(onDelete && ['DRAFT', 'SUBMITTED', 'REJECTED'].includes(invoice.status) && canSubmit ? [{ icon: <Trash2 className="h-4 w-4" />, label: 'Delete Invoice', variant: 'destructive' as const, onClick: (e: React.MouseEvent) => { e.stopPropagation(); onDelete(invoice); } }] : []),
  ];

  const showSubmitButton = canSubmit && invoice.status === 'DRAFT' && onSubmit;
  const showEditButton = canSubmit && invoice.status === 'DRAFT' && onEdit;
  const showApproveButton = canApprove && invoice.status === 'SUBMITTED' && onApprove;

  return (
    <div
      data-sasha-card="Invoice"
      className="relative group cursor-pointer bg-card border border-border rounded-lg hover:shadow-md transition-all animate-fade-in"
      onClick={onClick}
    >
      {/* 3px left accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
        style={{ backgroundColor: getAccent(invoice.status) }}
      />

      <div className="pl-4 pr-3.5 py-3.5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-medium text-sm" style={DT.mono}>{invoice.invoice_number}</h4>
            <p className="text-xs text-muted-foreground">
              {format(new Date(invoice.created_at), 'MMM d, yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <InvoiceAgeBadge invoice={invoice} />
            <HoverActions actions={hoverActions} />
            <StatusColumn value={invoice.status} options={INVOICE_STATUS_OPTIONS} size="sm" disabled />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Billing Period</p>
              <p className="font-medium text-xs truncate">
                {format(new Date(invoice.billing_period_start), 'MMM d')} –{' '}
                {format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Amount Due</p>
              <p className="font-bold text-sm" style={DT.mono}>{formatCurrency(invoice.total_amount)}</p>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        {(showSubmitButton || showEditButton || showApproveButton) && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t">
            {showEditButton && (
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onEdit!(invoice); }}>
                <Edit className="h-3.5 w-3.5 mr-1.5" />Edit
              </Button>
            )}
            {showSubmitButton && (
              <Button size="sm" onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                Submit
              </Button>
            )}
            {showApproveButton && (
              <Button size="sm" onClick={handleApprove} disabled={approving} className="bg-green-600 hover:bg-green-700">
                {approving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5 mr-1.5" />}
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
      </div>
    </div>
  );
}
