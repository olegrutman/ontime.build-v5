import { cn } from '@/lib/utils';
import type { YesNoNa } from '@/types/framingScope';

interface YesNoRowProps {
  label: string;
  subtitle?: string;
  value: YesNoNa;
  onChange: (v: YesNoNa) => void;
  showNa?: boolean;
}

const pills: { val: YesNoNa; label: string }[] = [
  { val: 'yes', label: 'Yes' },
  { val: 'no', label: 'No' },
];

export function YesNoRow({ label, subtitle, value, onChange, showNa = false }: YesNoRowProps) {
  const options = showNa ? [...pills, { val: 'na' as YesNoNa, label: 'N/A' }] : pills;

  return (
    <div className="flex items-start justify-between gap-4 py-3 px-1 border-b border-border/50 last:border-0 animate-fade-in">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex gap-1 shrink-0">
        {options.map(o => (
          <button
            key={o.val}
            type="button"
            onClick={() => onChange(value === o.val ? null : o.val)}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-full border transition-all',
              value === o.val
                ? o.val === 'yes'
                  ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                  : o.val === 'no'
                  ? 'bg-red-500/10 text-red-600 border-red-400/30'
                  : 'bg-muted text-muted-foreground border-border'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/20'
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
