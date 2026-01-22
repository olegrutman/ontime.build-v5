import { WorkItemType, WORK_ITEM_TYPE_LABELS } from '@/types/workItem';
import { Building2, FileText, RefreshCw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypeIndicatorProps {
  type: WorkItemType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const typeIcons: Record<WorkItemType, React.ReactNode> = {
  PROJECT: <Building2 className="w-4 h-4" />,
  SOV_ITEM: <FileText className="w-4 h-4" />,
  CHANGE_WORK: <RefreshCw className="w-4 h-4" />,
  TM_WORK: <Clock className="w-4 h-4" />,
};

const typeColorClasses: Record<WorkItemType, string> = {
  PROJECT: 'bg-type-project text-white',
  SOV_ITEM: 'bg-type-sov text-white',
  CHANGE_WORK: 'bg-type-change text-white',
  TM_WORK: 'bg-type-tm text-white',
};

export function TypeIndicator({ type, showLabel = false, size = 'md' }: TypeIndicatorProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <div className="flex items-center gap-2">
      <div 
        className={cn(
          'rounded-lg flex items-center justify-center',
          typeColorClasses[type],
          sizeClasses[size]
        )}
      >
        {typeIcons[type]}
      </div>
      {showLabel && (
        <span className="text-sm font-medium text-muted-foreground">
          {WORK_ITEM_TYPE_LABELS[type]}
        </span>
      )}
    </div>
  );
}

export function TypeDot({ type }: { type: WorkItemType }) {
  const dotColors: Record<WorkItemType, string> = {
    PROJECT: 'bg-type-project',
    SOV_ITEM: 'bg-type-sov',
    CHANGE_WORK: 'bg-type-change',
    TM_WORK: 'bg-type-tm',
  };

  return (
    <div className={cn('w-2 h-2 rounded-full', dotColors[type])} />
  );
}
