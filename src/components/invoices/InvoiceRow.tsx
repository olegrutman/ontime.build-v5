import { format, differenceInDays } from 'date-fns';
import { MoreVertical, Send, CheckCircle, Edit, Trash2, Eye, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Invoice, InvoiceStatus, INVOICE_STATUS_LABELS } from '@/types/invoice';
import { STATUS_ACCENTS } from '@/lib/design-tokens';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface InvoiceRowProps {
  invoice: Invoice;
  onClick: () => void;
  onEdit?: (invoice: Invoice) => void;
  onSubmit?: (invoice: Invoice) => Promise<void>;
  onApprove?: (invoice: Invoice) => Promise<void>;
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

function ageDays(invoice: Invoice): number | null {
  if (invoice.status === 'DRAFT' || invoice.status === 'PAID') return null;
  const ref = invoice.status === 'APPROVED'
    ? (invoice.approved_at || invoice.submitted_at || invoice.created_at)
    : (invoice.submitted_at || invoice.created_at);
  return differenceInDays(new Date(), new Date(ref));
}

export function InvoiceRow({
  invoice, onClick, onEdit, onSubmit, onApprove, onDelete,
  canSubmit = false, canApprove = false,
}: InvoiceRowProps) {
  const [busy, setBusy] = useState(false);
  const accent = getAccent(invoice.status);
  const days = ageDays(invoice);

  const showSubmit = canSubmit && invoice.status === 'DRAFT' && !!onSubmit;
  const showApprove = canApprove && invoice.status === 'SUBMITTED' && !!onApprove;
  const primaryAction = showSubmit
    ? { label: 'Submit', icon: Send, run: () => onSubmit!(invoice), tone: 'bg-blue-600 hover:bg-blue-700 text-white' }
    : showApprove
    ? { label: 'Approve', icon: CheckCircle, run: () => onApprove!(invoice), tone: 'bg-green-600 hover:bg-green-700 text-white' }
    : null;

  const handlePrimary = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!primaryAction) return;
    setBusy(true);
    try { await primaryAction.run(); } finally { setBusy(false); }
  };

  const ageColors = days === null
    ? ''
    : days <= 14 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
    : days <= 30 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';

  return (
    <div
      data-sasha-card="Invoice"
      className="relative flex items-stretch cursor-pointer bg-card hover:bg-muted/30 active:bg-muted/50 transition-colors"
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      {/* Status accent stripe */}
      <div className="w-[3px] shrink-0" style={{ backgroundColor: accent }} aria-hidden />

      <div className="flex-1 min-w-0 px-3 py-2.5">
        {/* Line 1: number + amount */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-sm font-medium truncate">{invoice.invoice_number}</span>
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide"
              style={{ color: accent, backgroundColor: `${accent}1a` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
              {INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus]}
            </span>
            {days !== null && (
              <Badge className={cn('font-mono text-[10px] px-1.5 py-0', ageColors)}>{days}d</Badge>
            )}
          </div>
          <span className="font-mono text-sm font-bold shrink-0 tabular-nums">
            {formatCurrency(invoice.total_amount)}
          </span>
        </div>

        {/* Line 2: period */}
        <div className="mt-1 flex items-center justify-between gap-2 min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {format(new Date(invoice.billing_period_start), 'MMM d')} – {format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}
          </p>

          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {primaryAction && (
              <Button
                size="sm"
                onClick={handlePrimary}
                disabled={busy}
                className={cn('h-7 px-2.5 text-xs', primaryAction.tone)}
              >
                {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <primaryAction.icon className="h-3 w-3 mr-1" />}
                {primaryAction.label}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={onClick}>
                  <Eye className="h-4 w-4 mr-2" /> View details
                </DropdownMenuItem>
                {onEdit && invoice.status === 'DRAFT' && canSubmit && (
                  <DropdownMenuItem onClick={() => onEdit(invoice)}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                  </DropdownMenuItem>
                )}
                {onDelete && ['DRAFT', 'SUBMITTED', 'REJECTED'].includes(invoice.status) && canSubmit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(invoice)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {invoice.rejection_reason && invoice.status === 'REJECTED' && (
          <div className="mt-1.5 text-xs text-red-700 dark:text-red-300 truncate">
            <strong>Rejected:</strong> {invoice.rejection_reason}
          </div>
        )}
      </div>
    </div>
  );
}
