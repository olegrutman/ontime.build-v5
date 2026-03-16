import { Zap, FileText } from 'lucide-react';
import type { UnifiedWizardData, WORequestType } from '@/types/unifiedWizard';

interface IntentStepProps {
  data: UnifiedWizardData;
  onChange: (updates: Partial<UnifiedWizardData>) => void;
}

const INTENT_OPTIONS: { value: WORequestType; icon: typeof Zap; title: string; body: string }[] = [
  {
    value: 'request',
    icon: Zap,
    title: 'Request from GC',
    body: 'Submit a scope and price to GC for approval before work begins.',
  },
  {
    value: 'log',
    icon: FileText,
    title: 'Log work in progress',
    body: 'Capture what your crew is doing now. Submit for approval when ready.',
  },
];

export function IntentStep({ data, onChange }: IntentStepProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
      {INTENT_OPTIONS.map((opt) => {
        const isSelected = data.wo_request_type === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange({ wo_request_type: opt.value })}
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
            </div>
          </button>
        );
      })}
    </div>
  );
}
