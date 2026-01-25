import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ChangeOrderWorkType, WORK_TYPE_LABELS } from '@/types/changeOrderProject';
import { Hammer, RotateCcw, Plus, SlidersHorizontal, Wrench } from 'lucide-react';

interface WorkTypeStepProps {
  workType: ChangeOrderWorkType | null;
  onChange: (workType: ChangeOrderWorkType) => void;
}

const WORK_TYPE_OPTIONS: { value: ChangeOrderWorkType; icon: React.ReactNode; description: string }[] = [
  {
    value: 'reframe',
    icon: <Hammer className="w-5 h-5" />,
    description: 'Rebuild or replace structural framing',
  },
  {
    value: 'reinstall',
    icon: <RotateCcw className="w-5 h-5" />,
    description: 'Remove and reinstall existing components',
  },
  {
    value: 'addition',
    icon: <Plus className="w-5 h-5" />,
    description: 'Add new components or features',
  },
  {
    value: 'adjust',
    icon: <SlidersHorizontal className="w-5 h-5" />,
    description: 'Modify or adjust existing work',
  },
  {
    value: 'fixing',
    icon: <Wrench className="w-5 h-5" />,
    description: 'Repair or fix defects',
  },
];

export function WorkTypeStep({ workType, onChange }: WorkTypeStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Type of Work</h3>
        <p className="text-sm text-muted-foreground">
          What type of work does this change order involve?
        </p>
      </div>

      <RadioGroup
        value={workType || ''}
        onValueChange={(value) => onChange(value as ChangeOrderWorkType)}
        className="grid gap-3"
      >
        {WORK_TYPE_OPTIONS.map((option) => (
          <div key={option.value} className="relative">
            <RadioGroupItem
              value={option.value}
              id={option.value}
              className="peer sr-only"
            />
            <Label
              htmlFor={option.value}
              className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
                {option.icon}
              </div>
              <div>
                <p className="font-medium">{WORK_TYPE_LABELS[option.value]}</p>
                <p className="text-sm text-muted-foreground">{option.description}</p>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
