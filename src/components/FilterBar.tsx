import { WorkItemType, WorkItemState, WORK_ITEM_TYPE_LABELS, WORK_ITEM_STATE_LABELS } from '@/types/workItem';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Building2, FileText, RefreshCw, Clock, Filter, X } from 'lucide-react';

interface FilterBarProps {
  selectedType: WorkItemType | 'ALL';
  selectedState: WorkItemState | 'ALL';
  onTypeChange: (type: WorkItemType | 'ALL') => void;
  onStateChange: (state: WorkItemState | 'ALL') => void;
}

const typeIcons: Record<WorkItemType, React.ReactNode> = {
  PROJECT: <Building2 className="w-4 h-4" />,
  SOV_ITEM: <FileText className="w-4 h-4" />,
  CHANGE_WORK: <RefreshCw className="w-4 h-4" />,
  TM_WORK: <Clock className="w-4 h-4" />,
};

export function FilterBar({ selectedType, selectedState, onTypeChange, onStateChange }: FilterBarProps) {
  const hasActiveFilters = selectedType !== 'ALL' || selectedState !== 'ALL';

  return (
    <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card rounded-lg border">
      {/* Type filters */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedType === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTypeChange('ALL')}
            className="h-8"
          >
            All
          </Button>
          {(Object.keys(WORK_ITEM_TYPE_LABELS) as WorkItemType[]).map(type => (
            <Button
              key={type}
              variant={selectedType === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTypeChange(type)}
              className={cn('h-8 gap-1.5')}
            >
              {typeIcons[type]}
              <span className="hidden sm:inline">{WORK_ITEM_TYPE_LABELS[type]}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* State filters */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">State</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedState === 'ALL' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onStateChange('ALL')}
            className="h-8"
          >
            All
          </Button>
          {(Object.keys(WORK_ITEM_STATE_LABELS) as WorkItemState[]).map(state => (
            <Button
              key={state}
              variant={selectedState === state ? 'default' : 'outline'}
              size="sm"
              onClick={() => onStateChange(state)}
              className={cn(
                'h-8',
                selectedState === state && state === 'OPEN' && 'bg-state-open hover:bg-state-open/90 text-state-open-foreground',
                selectedState === state && state === 'PRICED' && 'bg-state-priced hover:bg-state-priced/90 text-white',
                selectedState === state && state === 'APPROVED' && 'bg-state-approved hover:bg-state-approved/90 text-white',
                selectedState === state && state === 'EXECUTED' && 'bg-state-executed hover:bg-state-executed/90 text-white'
              )}
            >
              {WORK_ITEM_STATE_LABELS[state]}
            </Button>
          ))}
        </div>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onTypeChange('ALL');
            onStateChange('ALL');
          }}
          className="h-8 self-end text-muted-foreground"
        >
          <X className="w-4 h-4 mr-1" />
          Clear
        </Button>
      )}
    </div>
  );
}
