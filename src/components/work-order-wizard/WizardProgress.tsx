import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: { title: string; description?: string }[];
}

export function WizardProgress({ currentStep, totalSteps, steps }: WizardProgressProps) {
  const current = steps[currentStep - 1];

  return (
    <div className="px-6 py-4 border-b bg-muted/30">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
      </div>
      <div className="text-center mb-3">
        <h2 className="text-lg font-semibold">{current?.title}</h2>
        {current?.description && (
          <p className="text-sm text-muted-foreground mt-0.5">{current.description}</p>
        )}
      </div>
      <div className="flex gap-1">
        {steps.map((step, index) => {
          const stepNum = index + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <div
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors',
                isCompleted ? 'bg-primary' : isCurrent ? 'bg-primary/50' : 'bg-muted'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
