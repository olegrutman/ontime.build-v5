import { Badge } from '@/components/ui/badge';
import { ReturnStatus, RETURN_STATUS_LABELS, RETURN_STATUS_COLORS } from '@/types/return';

interface ReturnStatusBadgeProps {
  status: ReturnStatus;
  className?: string;
}

export function ReturnStatusBadge({ status, className }: ReturnStatusBadgeProps) {
  return (
    <Badge className={`${RETURN_STATUS_COLORS[status]} ${className || ''} pointer-events-none`}>
      {RETURN_STATUS_LABELS[status]}
    </Badge>
  );
}
