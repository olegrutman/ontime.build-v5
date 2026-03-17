interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
}

export function WizardProgress({ currentStep, totalSteps, steps }: WizardProgressProps) {
  return (
    <div className="px-6 py-4 border-b">
      <div className="flex items-center gap-2 mb-2">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                i < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : i === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </div>
            <span
              className={`text-xs hidden sm:inline ${
                i <= currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
              }`}
            >
              {step}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${i < currentStep ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Step {currentStep + 1} of {totalSteps}
      </p>
    </div>
  );
}
