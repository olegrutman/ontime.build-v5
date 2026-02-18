import { Badge } from '@/components/ui/badge';
import type { RFIPriority } from '@/types/rfi';

const PRIORITY_CONFIG: Record<RFIPriority, { label: string; className: string }> = {
  LOW: { label: 'Low', className: 'bg-muted text-muted-foreground' },
  MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  HIGH: { label: 'High', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  URGENT: { label: 'Urgent', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
};

export function RFIPriorityBadge({ priority }: { priority: RFIPriority }) {
  const config = PRIORITY_CONFIG[priority];
  return <Badge className={config.className}>{config.label}</Badge>;
}
