import { cn } from '@/lib/utils';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface ScopeRadioGroupProps {
  label: string;
  subtitle?: string;
  options: RadioOption[];
  value: string | null;
  onChange: (v: string) => void;
}

export function ScopeRadioGroup({ label, subtitle, options, value, onChange }: ScopeRadioGroupProps) {
  return (
    <div className="py-3 px-1 border-b border-border/50 last:border-0 animate-fade-in">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {subtitle && <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>}
      <div className="grid gap-1.5">
        {options.map(o => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-col items-start text-left px-3 py-2 rounded-md border transition-all text-sm',
              value === o.value
                ? 'bg-primary/10 border-primary/30 text-foreground'
                : 'bg-card border-border hover:border-foreground/20 text-foreground'
            )}
          >
            <span className="font-medium">{o.label}</span>
            {o.description && (
              <span className="text-xs text-muted-foreground mt-0.5">{o.description}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
