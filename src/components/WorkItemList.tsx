import { useState } from 'react';
import { WorkItem, WorkItemType, WorkItemState } from '@/types/workItem';
import { WorkItemCard } from './WorkItemCard';
import { buildWorkItemTree } from '@/data/mockWorkItems';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkItemListProps {
  items: WorkItem[];
  onSelect?: (item: WorkItem) => void;
  selectedId?: string;
  filterType?: WorkItemType | 'ALL';
  filterState?: WorkItemState | 'ALL';
}

interface TreeNodeProps {
  item: WorkItem;
  depth?: number;
  onSelect?: (item: WorkItem) => void;
  selectedId?: string;
  filterType?: WorkItemType | 'ALL';
  filterState?: WorkItemState | 'ALL';
}

function TreeNode({ item, depth = 0, onSelect, selectedId, filterType, filterState }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;

  // Filter logic
  const matchesFilter = 
    (filterType === 'ALL' || !filterType || item.type === filterType) &&
    (filterState === 'ALL' || !filterState || item.state === filterState);

  // Check if any children match
  const hasMatchingChildren = item.children?.some(child => 
    (filterType === 'ALL' || !filterType || child.type === filterType) &&
    (filterState === 'ALL' || !filterState || child.state === filterState)
  );

  if (!matchesFilter && !hasMatchingChildren) return null;

  return (
    <div className="animate-fade-in">
      <div className="relative">
        {/* Connector line for children */}
        {depth > 0 && (
          <div 
            className="absolute left-4 top-0 bottom-0 w-px bg-border"
            style={{ left: `${depth * 32 - 16}px` }}
          />
        )}
        
        <div 
          className="flex items-start gap-2"
          style={{ marginLeft: depth > 0 ? `${depth * 32}px` : 0 }}
        >
          {/* Expand/collapse button */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="mt-4 p-1 hover:bg-muted rounded transition-colors shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          )}
          
          {/* Spacer if no children */}
          {!hasChildren && depth > 0 && <div className="w-6" />}
          
          {/* Card */}
          <div className="flex-1 mb-2">
            {matchesFilter && (
              <WorkItemCard
                item={item}
                onClick={() => onSelect?.(item)}
                isSelected={selectedId === item.id}
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative">
          {item.children!.map(child => (
            <TreeNode
              key={child.id}
              item={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
              filterType={filterType}
              filterState={filterState}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkItemList({ items, onSelect, selectedId, filterType = 'ALL', filterState = 'ALL' }: WorkItemListProps) {
  const tree = buildWorkItemTree(items);

  return (
    <div className="space-y-2">
      {tree.map(item => (
        <TreeNode
          key={item.id}
          item={item}
          onSelect={onSelect}
          selectedId={selectedId}
          filterType={filterType}
          filterState={filterState}
        />
      ))}
    </div>
  );
}
