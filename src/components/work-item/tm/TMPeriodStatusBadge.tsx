import { Badge } from '@/components/ui/badge';
import { TMPeriodStatus } from './types';

interface TMPeriodStatusBadgeProps {
  status: TMPeriodStatus | string;
}

const STATUS_CONFIG: Record<TMPeriodStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  OPEN: { label: 'Open', variant: 'outline' },
  SUBMITTED: { label: 'Submitted', variant: 'secondary' },
  APPROVED: { label: 'Approved', variant: 'default' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
};

export function TMPeriodStatusBadge({ status }: TMPeriodStatusBadgeProps) {
  const config = STATUS_CONFIG[status as TMPeriodStatus] || STATUS_CONFIG.OPEN;
  
  return (
    <Badge variant={config.variant}>
      {config.label}
    </Badge>
  );
}
