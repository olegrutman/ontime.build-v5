interface StepIndicatorProps {
  currentStep: number;
  labels: string[];
}

export function StepIndicator({ currentStep, labels }: StepIndicatorProps) {
  return (
    <div className="auth-steps">
      {labels.map((label, i) => {
        const step = i + 1;
        const isDone = step < currentStep;
        const isActive = step === currentStep;
        return (
          <span key={step} style={{ display: 'contents' }}>
            <div className="auth-step-node">
              <div className={`auth-step-circle ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                {isDone ? '✓' : step}
              </div>
              <span className={`auth-step-label ${isDone ? 'done' : isActive ? 'active' : ''}`}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={`auth-step-line ${isDone ? 'done' : ''}`} />
            )}
          </span>
        );
      })}
    </div>
  );
}
