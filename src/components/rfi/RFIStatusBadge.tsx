import { Badge } from '@/components/ui/badge';
import type { RFIStatus } from '@/types/rfi';

const STATUS_CONFIG: Record<RFIStatus, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  ANSWERED: { label: 'Answered', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  CLOSED: { label: 'Closed', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
};

export function RFIStatusBadge({ status }: { status: RFIStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}
