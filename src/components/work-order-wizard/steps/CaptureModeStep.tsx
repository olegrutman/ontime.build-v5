import { Zap, FileText } from 'lucide-react';
import type { WorkOrderWizardData, WOMode } from '@/types/workOrderWizard';

interface CaptureModeStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
}

const MODE_OPTIONS: { value: WOMode; icon: typeof Zap; title: string; body: string; sub: string }[] = [
  {
    value: 'quick_capture',
    icon: Zap,
    title: 'Quick Capture',
    body: 'Pick tasks as you find them. Auto-saves after location. Come back anytime to add more.',
    sub: 'Best for job walks and reactive work.',
  },
  {
    value: 'full_scope',
    icon: FileText,
    title: 'Full Scope',
    body: 'Write the complete scope in one sitting. Best for planned changes and formal proposals.',
    sub: 'Best for defined change orders.',
  },
];

export function CaptureModeStep({ data, onChange }: CaptureModeStepProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
      {MODE_OPTIONS.map((opt) => {
        const isSelected = data.wo_mode === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange({
              wo_mode: opt.value,
              labor_mode: opt.value === 'quick_capture' ? 'hourly' : 'lump_sum',
            })}
            className={`flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all ${
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/40 hover:bg-muted/50'
            }`}
          >
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">{opt.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{opt.body}</p>
              <p className="text-[11px] text-muted-foreground/70 mt-2 italic">{opt.sub}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
