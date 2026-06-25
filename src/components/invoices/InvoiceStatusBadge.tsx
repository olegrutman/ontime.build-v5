import { Badge } from '@/components/ui/badge';
import { InvoiceStatus, INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '@/types/invoice';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

export function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  return (
    <Badge className={INVOICE_STATUS_COLORS[status]}>
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}
