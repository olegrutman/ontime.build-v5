import { Badge } from '@/components/ui/badge';
import { POStatus, PO_STATUS_LABELS, PO_STATUS_COLORS } from '@/types/purchaseOrder';

interface POStatusBadgeProps {
  status: POStatus;
}

export function POStatusBadge({ status }: POStatusBadgeProps) {
  return (
    <Badge className={PO_STATUS_COLORS[status]}>
      {PO_STATUS_LABELS[status]}
    </Badge>
  );
}
