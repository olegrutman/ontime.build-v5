import { cn } from '@/lib/utils';
import type { COPricingType } from '@/types/changeOrder';
import { PRICING_TYPE_GUIDE } from '@/lib/pricingTypeChoice';

const ORDER: COPricingType[] = ['fixed', 'tm', 'nte'];

interface Props {
  value: COPricingType;
  onChange: (value: COPricingType) => void;
  disabled?: boolean;
  /** Stack vertically (dialogs / narrow columns). */
  stacked?: boolean;
}

/** Shared Fixed / T&M / NTE picker with plain-language guidance so users don't pick the wrong model. */
export function PricingTypeChoice({ value, onChange, disabled, stacked }: Props) {
  return (
    <div role="radiogroup" aria-label="Pricing type" className={cn('grid grid-cols-1 gap-2', !stacked && 'md:grid-cols-3')}>
      {ORDER.map(key => {
        const g = PRICING_TYPE_GUIDE[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(key)}
            className={cn(
              'min-w-0 rounded-xl border-2 p-3 text-left transition-all disabled:cursor-default',
              active ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">{g.name}</span>
              <span className={cn('h-4 w-4 shrink-0 rounded-full border-2', active ? 'border-primary bg-primary' : 'border-muted-foreground/40')} />
            </div>
            <p className="mt-1 text-xs leading-snug text-foreground/80 break-words">{g.what}</p>
            <p className="mt-1.5 text-xs font-medium text-foreground/70 break-words">{g.bestFor}</p>
            <p className="mt-0.5 text-xs italic text-muted-foreground break-words">{g.example}</p>
            {active && <p className="mt-2 border-t pt-2 text-[0.7rem] text-muted-foreground break-words">{g.next}</p>}
          </button>
        );
      })}
    </div>
  );
}
