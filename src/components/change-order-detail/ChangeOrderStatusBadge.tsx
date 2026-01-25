import { Badge } from '@/components/ui/badge';
import { ChangeOrderStatus, CHANGE_ORDER_STATUS_LABELS } from '@/types/changeOrderProject';
import { cn } from '@/lib/utils';

interface ChangeOrderStatusBadgeProps {
  status: ChangeOrderStatus;
  className?: string;
}

const statusVariants: Record<ChangeOrderStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  fc_input: 'bg-blue-100 text-blue-700 border-blue-300',
  tc_pricing: 'bg-amber-100 text-amber-700 border-amber-300',
  ready_for_approval: 'bg-purple-100 text-purple-700 border-purple-300',
  approved: 'bg-green-100 text-green-700 border-green-300',
  rejected: 'bg-red-100 text-red-700 border-red-300',
  contracted: 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

export function ChangeOrderStatusBadge({ status, className }: ChangeOrderStatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', statusVariants[status], className)}
    >
      {CHANGE_ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}
