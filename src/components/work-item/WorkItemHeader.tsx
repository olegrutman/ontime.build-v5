import { WorkItemData } from './WorkItemPage';
import { StateBadge } from '@/components/StateBadge';
import { TypeIndicator } from '@/components/TypeIndicator';
import { WORK_ITEM_TYPE_LABELS, WorkItemType, WorkItemState } from '@/types/workItem';

interface WorkItemHeaderProps {
  workItem: WorkItemData;
}

export function WorkItemHeader({ workItem }: WorkItemHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <TypeIndicator type={workItem.item_type as WorkItemType} size="lg" />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {workItem.code && (
            <code className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {workItem.code}
            </code>
          )}
          <StateBadge state={workItem.state as WorkItemState} />
        </div>
        <h1 className="text-2xl font-bold">{workItem.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {WORK_ITEM_TYPE_LABELS[workItem.item_type as WorkItemType]}
        </p>
      </div>
    </div>
  );
}
