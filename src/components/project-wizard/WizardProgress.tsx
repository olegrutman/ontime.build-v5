import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentStep: number;
  steps: { label: string; description: string }[];
}

export function WizardProgress({ currentStep, steps }: WizardProgressProps) {
  return (
    <div className="relative">
      {/* Progress line */}
      <div className="absolute left-4 top-4 h-full w-0.5 bg-muted" />
      
      <div className="space-y-4">
        {steps.map((step, index) => {
          const isComplete = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div key={index} className="relative flex items-start gap-4 pl-0">
              {/* Step indicator */}
              <div
                className={cn(
                  'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                  isComplete && 'border-primary bg-primary text-primary-foreground',
                  isCurrent && 'border-primary bg-background text-primary',
                  !isComplete && !isCurrent && 'border-muted bg-background text-muted-foreground'
                )}
              >
                {isComplete ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              
              {/* Step content */}
              <div className="pt-1">
                <p
                  className={cn(
                    'text-sm font-medium',
                    (isComplete || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
