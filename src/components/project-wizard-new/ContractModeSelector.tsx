import { cn } from '@/lib/utils';
import { FileText, Wrench } from 'lucide-react';

export type ContractMode = 'fixed' | 'tm';

interface Props {
  selected: ContractMode;
  onSelect: (mode: ContractMode) => void;
}

const OPTIONS = [
  {
    mode: 'fixed' as const,
    icon: FileText,
    label: 'Fixed Contract',
    description: 'Pre-defined contract value with a locked scope of work. Best for projects with clear plans and budgets.',
  },
  {
    mode: 'tm' as const,
    icon: Wrench,
    label: 'Remodel / T&M',
    description: 'No upfront contract value. Work Orders define scope as the project grows. Best for remodels and time & material jobs.',
  },
];

export function ContractModeSelector({ selected, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-heading text-xl font-bold text-foreground">
          How is this project structured?
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          This determines how contracts, scope, and billing are managed.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const active = selected === opt.mode;
          return (
            <button
              key={opt.mode}
              onClick={() => onSelect(opt.mode)}
              className={cn(
                'flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-center',
                'hover:border-primary/60 hover:bg-primary/5',
                active
                  ? 'border-primary bg-primary/10 shadow-sm'
                  : 'border-border bg-card',
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                <Icon className="w-6 h-6" />
              </div>
              <span className="font-heading text-sm font-bold leading-tight">{opt.label}</span>
              <span className="text-[11px] text-muted-foreground leading-snug">{opt.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
