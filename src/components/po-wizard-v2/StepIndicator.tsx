import { Check } from 'lucide-react';

type StepStatus = 'done' | 'active' | 'upcoming';

interface Step {
  label: string;
  status: StepStatus;
}

interface StepIndicatorProps {
  steps: Step[];
}

export function StepIndicator({ steps }: StepIndicatorProps) {
  return (
    <div className="wz-steps">
      {steps.map((step, i) => (
        <div key={step.label} className="wz-step">
          {/* Connecting line (except for last step) */}
          {i < steps.length - 1 && (
            <div
              className={`wz-step-line ${
                step.status === 'done' ? 'wz-step-line--done' : ''
              }`}
            />
          )}
          <div
            className={`wz-step-dot relative z-10 ${
              step.status === 'done'
                ? 'wz-step-dot--done'
                : step.status === 'active'
                ? 'wz-step-dot--active'
                : 'wz-step-dot--upcoming'
            }`}
          >
            {step.status === 'done' ? (
              <Check className="h-4 w-4" />
            ) : (
              i + 1
            )}
          </div>
          <span
            className={`wz-step-label ${
              step.status === 'done'
                ? 'wz-step-label--done'
                : step.status === 'active'
                ? 'wz-step-label--active'
                : 'wz-step-label--upcoming'
            }`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
