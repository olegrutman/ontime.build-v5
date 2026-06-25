import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ScopeCheckboxGroupProps {
  label: string;
  subtitle?: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  columns?: 2 | 3;
}

export function ScopeCheckboxGroup({ label, subtitle, options, selected, onChange, columns = 2 }: ScopeCheckboxGroupProps) {
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val]);
  };

  return (
    <div className="py-3 px-1 border-b border-border/50 last:border-0 animate-fade-in">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {subtitle && <p className="text-xs text-muted-foreground mb-2">{subtitle}</p>}
      <div className={cn('grid gap-1.5', columns === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2')}>
        {options.map(o => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md border text-sm text-left transition-all',
                on ? 'bg-primary/10 border-primary/30' : 'bg-card border-border hover:border-foreground/20'
              )}
            >
              <div className={cn(
                'w-4 h-4 rounded-sm border flex items-center justify-center shrink-0',
                on ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
              )}>
                {on && <Check className="w-3 h-3" />}
              </div>
              <span className="text-foreground">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
