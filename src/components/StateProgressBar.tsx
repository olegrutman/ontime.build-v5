import { WorkItemState, STATE_ORDER, WORK_ITEM_STATE_LABELS } from '@/types/workItem';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StateProgressBarProps {
  currentState: WorkItemState;
  onStateChange?: (state: WorkItemState) => void;
  readonly?: boolean;
}

export function StateProgressBar({ currentState, onStateChange, readonly = false }: StateProgressBarProps) {
  const currentIndex = STATE_ORDER.indexOf(currentState);

  return (
    <div className="flex items-center gap-1">
      {STATE_ORDER.map((state, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={state} className="flex items-center flex-1">
            {/* Step indicator */}
            <button
              onClick={() => !readonly && onStateChange?.(state)}
              disabled={readonly}
              className={cn(
                'relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all',
                'text-xs font-semibold',
                isCompleted && 'bg-state-approved border-state-approved text-white',
                isCurrent && 'border-primary bg-primary text-primary-foreground',
                isPending && 'border-border bg-background text-muted-foreground',
                !readonly && 'cursor-pointer hover:scale-110'
              )}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                <span>{index + 1}</span>
              )}
            </button>
            
            {/* Connector line */}
            {index < STATE_ORDER.length - 1 && (
              <div 
                className={cn(
                  'flex-1 h-0.5 mx-1',
                  index < currentIndex ? 'bg-state-approved' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function StateProgressLabels() {
  return (
    <div className="flex justify-between mt-2">
      {STATE_ORDER.map(state => (
        <span key={state} className="text-[10px] text-muted-foreground uppercase tracking-wide">
          {WORK_ITEM_STATE_LABELS[state]}
        </span>
      ))}
    </div>
  );
}
