import { Check, X } from 'lucide-react';
import { ChangeOrderStatus, CHANGE_ORDER_STATUS_LABELS } from '@/types/changeOrderProject';
import { cn } from '@/lib/utils';

interface WorkOrderProgressBarProps {
  status: ChangeOrderStatus;
  hasFCParticipant: boolean;
}

interface Step {
  key: ChangeOrderStatus;
  label: string;
}

const STATUS_ORDER: ChangeOrderStatus[] = [
  'draft',
  'fc_input',
  'tc_pricing',
  'ready_for_approval',
  'contracted',
];

const SHORT_LABELS: Record<ChangeOrderStatus, string> = {
  draft: 'In Progress',
  fc_input: 'FC Input',
  tc_pricing: 'TC Pricing',
  ready_for_approval: 'Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  contracted: 'Contracted',
};

export function WorkOrderProgressBar({ status, hasFCParticipant }: WorkOrderProgressBarProps) {
  const steps: Step[] = STATUS_ORDER
    .filter((s) => s !== 'fc_input' || hasFCParticipant)
    .map((s) => ({ key: s, label: SHORT_LABELS[s] }));

  const isRejected = status === 'rejected';
  const isApproved = status === 'approved';

  // Map approved to contracted index for progress purposes
  const effectiveStatus = isApproved ? 'contracted' : status;
  const currentIndex = isRejected
    ? steps.findIndex((s) => s.key === 'ready_for_approval')
    : steps.findIndex((s) => s.key === effectiveStatus);

  return (
    <div className="w-full px-2 sm:px-6 py-4 overflow-x-auto">
      <div className="flex items-center w-full min-w-0">
        {steps.map((step, index) => {
          const isCompleted = !isRejected && index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;

          return (
            <div
              key={step.key}
              className={cn(
                'flex items-center min-w-0',
                index < steps.length - 1 ? 'flex-1' : ''
              )}
            >
              {/* Step node */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors shrink-0',
                    isCompleted && 'bg-green-500 border-green-500 text-white',
                    isCurrent && !isRejected && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && isRejected && 'bg-destructive border-destructive text-destructive-foreground',
                    isFuture && 'bg-muted border-muted-foreground/20 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent && isRejected ? (
                    <X className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-medium whitespace-nowrap',
                    isCompleted && 'text-green-600',
                    isCurrent && !isRejected && 'text-primary',
                    isCurrent && isRejected && 'text-destructive',
                    isFuture && 'text-muted-foreground'
                  )}
                >
                  {isCurrent && isRejected ? 'Rejected' : step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1 sm:mx-2 mt-[-1.25rem]',
                    index < currentIndex
                      ? 'bg-green-500'
                      : 'bg-muted-foreground/20'
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
