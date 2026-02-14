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
    <div className="w-full px-2 sm:px-6 py-4 overflow-x-auto">
      <div className="flex items-center w-full min-w-0">
        {STATE_ORDER.map((state, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div
              key={state}
              className={cn(
                'flex items-center min-w-0',
                index < STATE_ORDER.length - 1 ? 'flex-1' : ''
              )}
            >
              {/* Step node */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={() => !readonly && onStateChange?.(state)}
                  disabled={readonly}
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors shrink-0',
                    isCompleted && 'bg-green-500 border-green-500 text-white',
                    isCurrent && 'bg-primary border-primary text-primary-foreground',
                    isFuture && 'bg-muted border-muted-foreground/20 text-muted-foreground',
                    !readonly && 'cursor-pointer hover:scale-110'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>
                <span
                  className={cn(
                    'text-[11px] font-medium whitespace-nowrap',
                    isCompleted && 'text-green-600',
                    isCurrent && 'text-primary',
                    isFuture && 'text-muted-foreground'
                  )}
                >
                  {WORK_ITEM_STATE_LABELS[state]}
                </span>
              </div>

              {/* Connector line */}
              {index < STATE_ORDER.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1 sm:mx-2 mt-[-1.25rem]',
                    index < currentIndex ? 'bg-green-500' : 'bg-muted-foreground/20'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
