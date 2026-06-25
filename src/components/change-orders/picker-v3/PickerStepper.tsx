import { cn } from '@/lib/utils';
import { Check, AlertCircle } from 'lucide-react';
import { PICKER_STEPS } from './types';

interface PickerStepperProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps?: Set<number>;
}

export function PickerStepper({ currentStep, onStepClick, completedSteps }: PickerStepperProps) {
  return (
    <div className="bg-background border-b flex items-center gap-1.5 px-6 py-3.5 overflow-x-auto scrollbar-hide sticky top-[57px] z-[9]">
      {PICKER_STEPS.map((step, i) => {
        const isDone = completedSteps?.has(step.num) ?? step.num < currentStep;
        const isActive = step.num === currentStep;
        const isRequired = step.num <= 2; // Where + Why are required
        return (
          <div key={step.key} className="contents">
            <button
              type="button"
              onClick={() => onStepClick(step.num)}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-lg shrink-0 transition-all',
                isActive && 'bg-muted/50',
                !isActive && !isDone && 'hover:bg-muted/30',
              )}
            >
              <span
                className={cn(
                  'w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.7rem] font-bold shrink-0 border-[1.5px] transition-all',
                  isDone && 'bg-green-600 border-green-600 text-white',
                  isActive && 'bg-[hsl(var(--navy))] border-[hsl(var(--navy))] text-white shadow-[0_0_0_4px_rgba(13,31,60,0.12)]',
                  !isDone && !isActive && isRequired && 'bg-amber-50 border-amber-300 text-amber-600',
                  !isDone && !isActive && !isRequired && 'bg-muted border-border text-muted-foreground',
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : step.num}
              </span>
              <span
                className={cn(
                  'text-[0.74rem] font-semibold whitespace-nowrap',
                  isDone && 'text-foreground/80',
                  isActive && 'text-[hsl(var(--navy))] font-bold',
                  !isDone && !isActive && 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
            </button>
            {i < PICKER_STEPS.length - 1 && (
              <div
                className={cn(
                  'w-[18px] h-[1.5px] shrink-0 transition-colors',
                  isDone ? 'bg-green-600' : 'bg-border',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
