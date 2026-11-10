import { Badge } from '@/components/ui/badge';
import type { RFIStatus } from '@/types/rfi';

const STATUS_CONFIG: Record<RFIStatus, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-type-sov/10 text-type-sov' },
  ANSWERED: { label: 'Answered', className: 'bg-state-open-bg text-state-open-foreground' },
  CLOSED: { label: 'Closed', className: 'bg-state-approved-bg text-state-approved-foreground' },
};

export function RFIStatusBadge({ status }: { status: RFIStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}
