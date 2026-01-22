import { WorkItemState, WORK_ITEM_STATE_LABELS } from '@/types/workItem';
import { Circle, CheckCircle2, Clock, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StateBadgeProps {
  state: WorkItemState;
  size?: 'sm' | 'md';
}

const stateIcons: Record<WorkItemState, React.ReactNode> = {
  OPEN: <Circle className="w-3 h-3" />,
  PRICED: <DollarSign className="w-3 h-3" />,
  APPROVED: <Clock className="w-3 h-3" />,
  EXECUTED: <CheckCircle2 className="w-3 h-3" />,
};

export function StateBadge({ state, size = 'md' }: StateBadgeProps) {
  const stateClass = `state-${state.toLowerCase()}`;
  
  return (
    <span 
      className={cn(
        'state-badge',
        stateClass,
        size === 'sm' && 'text-[10px] px-2 py-0.5'
      )}
    >
      {stateIcons[state]}
      {WORK_ITEM_STATE_LABELS[state]}
    </span>
  );
}
