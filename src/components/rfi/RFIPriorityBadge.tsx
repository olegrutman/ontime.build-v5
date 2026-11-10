import { Badge } from '@/components/ui/badge';
import type { RFIPriority } from '@/types/rfi';

const PRIORITY_CONFIG: Record<RFIPriority, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  MEDIUM: { label: 'Medium', className: 'bg-type-sov/10 text-type-sov' },
  HIGH: { label: 'High', className: 'bg-state-open-bg text-state-open-foreground' },
  URGENT: { label: 'Urgent', className: 'bg-destructive/10 text-destructive' },
};

export function RFIPriorityBadge({ priority }: { priority: RFIPriority }) {
  const config = PRIORITY_CONFIG[priority];
  return <Badge className={config.className}>{config.label}</Badge>;
}
