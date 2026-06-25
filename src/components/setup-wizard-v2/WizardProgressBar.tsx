import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { WIZARD_STEPS } from '@/hooks/useSetupWizardV2';

interface Props {
  currentStep: number;
}

export function WizardProgressBar({ currentStep }: Props) {
  return (
    <div className="px-4 py-3 border-b border-border bg-muted/20">
      <div className="flex items-center gap-1 overflow-x-auto">
        {WIZARD_STEPS.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={step.key} className="flex items-center gap-1">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                    done ? 'bg-emerald-500 text-white' :
                    active ? 'bg-primary text-primary-foreground' :
                    'bg-muted/60 text-muted-foreground',
                  )}
                >
                  {done ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span
                  className={cn(
                    'text-[10px] whitespace-nowrap hidden sm:inline',
                    active ? 'font-semibold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < WIZARD_STEPS.length - 1 && (
                <div className={cn('w-4 h-0.5 shrink-0', done ? 'bg-emerald-500' : 'bg-muted/40')} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
