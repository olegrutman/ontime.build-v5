import { Zap, FileText } from 'lucide-react';
import type { UnifiedWizardData, WOMode } from '@/types/unifiedWizard';

interface CaptureModeStepProps {
  data: UnifiedWizardData;
  onChange: (updates: Partial<UnifiedWizardData>) => void;
}

const MODE_OPTIONS: {
  value: WOMode;
  icon: typeof Zap;
  title: string;
  body: string;
  sub: string;
}[] = [
  {
    value: 'quick_capture',
    icon: Zap,
    title: 'Quick Capture',
    body: 'Pick tasks from the catalog. Log hours and costs as work happens. The draft saves automatically — come back anytime to add more.',
    sub: 'Best for daily field logging and small recurring tasks.',
  },
  {
    value: 'full_scope',
    icon: FileText,
    title: 'Full Scope',
    body: 'Write a complete scope, set your price, and submit for GC approval in one sitting.',
    sub: 'Best for defined change orders where GC needs a formal proposal.',
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
