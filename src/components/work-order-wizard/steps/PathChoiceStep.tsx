import { Camera, ClipboardList } from 'lucide-react';
import type { WorkOrderWizardData, WOCreationPath } from '@/types/workOrderWizard';

interface PathChoiceStepProps {
  data: WorkOrderWizardData;
  onChange: (updates: Partial<WorkOrderWizardData>) => void;
}

const PATH_OPTIONS: { value: WOCreationPath; icon: typeof Camera; title: string; body: string; sub: string }[] = [
  {
    value: 'field_capture',
    icon: Camera,
    title: 'Field Capture',
    body: 'Quick photo, voice note, or text to document an issue on site.',
    sub: 'Best for job walks and reactive issues.',
  },
  {
    value: 'full_work_order',
    icon: ClipboardList,
    title: 'Full Work Order',
    body: 'Select scope, assign location, and invite team members. Pricing added later by assigned parties.',
    sub: 'Best for planned change work.',
  },
];

export function PathChoiceStep({ data, onChange }: PathChoiceStepProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
      {PATH_OPTIONS.map((opt) => {
        const isSelected = data.creation_path === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange({ creation_path: opt.value })}
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
