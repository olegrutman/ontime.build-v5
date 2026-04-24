import { Sparkles, Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScopePickerMode = 'qa' | 'browse' | 'type';

interface StepCatalogModeSwitchProps {
  value: ScopePickerMode;
  onChange: (mode: ScopePickerMode) => void;
}

export function StepCatalogModeSwitch({ value, onChange }: StepCatalogModeSwitchProps) {
  return (
    <div className="rounded-lg border bg-card p-1 grid grid-cols-3 gap-1">
      <ModeButton
        active={value === 'qa'}
        onClick={() => onChange('qa')}
        icon={<Sparkles className="h-4 w-4" />}
        label="Ask Sasha"
        sub="Recommended"
        accent="amber"
      />
      <ModeButton
        active={value === 'type'}
        onClick={() => onChange('type')}
        icon={<Keyboard className="h-4 w-4" />}
        label="Type it"
        sub="Free text → AI"
      />
      <ModeButton
        active={value === 'browse'}
        onClick={() => onChange('browse')}
        icon={<span className="text-base leading-none">☰</span>}
        label="Browse"
        sub="Manual catalog"
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
  sub,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
  accent?: 'amber';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 px-2 py-2 rounded-md text-center transition-all min-h-[56px]',
        active
          ? accent === 'amber'
            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 shadow-sm'
            : 'bg-secondary text-secondary-foreground shadow-sm'
          : 'text-muted-foreground hover:bg-muted/40'
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <span className="text-[10px] leading-tight opacity-70">{sub}</span>
    </button>
  );
}
