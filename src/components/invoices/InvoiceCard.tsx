import { format } from 'date-fns';
import { FileText, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { Invoice, InvoiceStatus } from '@/types/invoice';

interface InvoiceCardProps {
  invoice: Invoice;
  onClick: () => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function InvoiceCard({ invoice, onClick }: InvoiceCardProps) {
  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{invoice.invoice_number}</h4>
              <p className="text-xs text-muted-foreground">
                {format(new Date(invoice.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Billing Period</p>
              <p className="font-medium">
                {format(new Date(invoice.billing_period_start), 'MMM d')} -{' '}
                {format(new Date(invoice.billing_period_end), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Amount Due</p>
              <p className="font-bold">{formatCurrency(invoice.total_amount)}</p>
            </div>
          </div>
        </div>

        {invoice.rejection_reason && invoice.status === 'REJECTED' && (
          <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-700 dark:text-red-300">
            <strong>Rejection:</strong> {invoice.rejection_reason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
