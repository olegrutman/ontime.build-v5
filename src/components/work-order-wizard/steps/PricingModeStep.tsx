import { WorkOrderWizardData } from '@/types/workOrderWizard';
import { Card } from '@/components/ui/card';
import { DollarSign, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricingModeStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
}

const OPTIONS = [
  {
    value: 'fixed' as const,
    label: 'Fixed Price',
    description: 'Set a total price upfront for the work.',
    icon: DollarSign,
  },
  {
    value: 'tm' as const,
    label: 'Time & Material',
    description: 'Track hours daily. Pay for actual time worked.',
    icon: Clock,
  },
];

export function PricingModeStep({ data, onChange }: PricingModeStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {OPTIONS.map((opt) => {
          const selected = data.pricing_mode === opt.value;
          const Icon = opt.icon;
          return (
            <Card
              key={opt.value}
              className={cn(
                'p-4 cursor-pointer transition-all hover:shadow-md',
                selected
                  ? 'ring-2 ring-primary border-primary bg-primary/5'
                  : 'hover:border-primary/50'
              )}
              onClick={() => onChange({ pricing_mode: opt.value })}
            >
              <div className="flex flex-col items-center text-center gap-3">
                <div
                  className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
