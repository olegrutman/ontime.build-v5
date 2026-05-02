import { cn } from '@/lib/utils';
import type { PickerState, PickerAction } from './types';
import type { COPricingType } from '@/types/changeOrder';

interface StepPricingProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
}

const PRICING_OPTIONS: { type: COPricingType; tag: string; name: string; desc: string; isDefault?: boolean }[] = [
  { type: 'fixed', tag: 'Recommended', name: 'Fixed Price', desc: 'One number, signed off upfront. Auto-calculated from labor + materials + markup.', isDefault: true },
  { type: 'tm', tag: 'Track Actuals', name: 'Time & Materials', desc: 'Bill hourly rates + materials at cost or with markup. No total upfront.' },
  { type: 'nte', tag: 'With Ceiling', name: 'Not To Exceed', desc: 'T&M up to a ceiling number. We\'ll warn you when actuals hit 80%.' },
];

export function StepPricing({ state, dispatch }: StepPricingProps) {
  const cur = state.items[state.currentItemIndex];

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 4 of 9 · Pricing Model</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          How will this be priced?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          This changes which fields you'll fill in next. Most COs go out as Fixed.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 max-sm:grid-cols-1">
        {PRICING_OPTIONS.map(opt => {
          const selected = cur.pricingType === opt.type;
          return (
            <button
              key={opt.type}
              type="button"
              onClick={() => dispatch({ type: 'SET_PRICING', pricingType: opt.type, pricingName: opt.name })}
              className={cn(
                'p-4 rounded-xl border-[1.5px] text-left transition-all relative',
                selected
                  ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_3px_rgba(245,166,35,0.18)]'
                  : 'bg-background border-border hover:border-amber-300 hover:bg-amber-50',
              )}
            >
              {selected && (
                <span className="absolute top-2.5 right-2.5 w-[22px] h-[22px] rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[0.8rem]">
                  ✓
                </span>
              )}
              {opt.isDefault && !selected && (
                <span className="absolute top-2.5 right-2.5 text-[0.55rem] font-bold text-green-600 uppercase">Default</span>
              )}
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.5px] text-amber-700 mb-1">{opt.tag}</p>
              <p className="font-heading text-[1.2rem] font-extrabold text-foreground tracking-tight mb-1">{opt.name}</p>
              <p className="text-[0.72rem] text-muted-foreground leading-snug">{opt.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
