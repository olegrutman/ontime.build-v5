import type { PickerState, PickerAction } from './types';
import { itemLaborTotal, itemMaterialTotal, itemEquipmentTotal, itemSubtotal } from './types';

interface StepTotalProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
  onAddItem: () => void;
  onGoReview: () => void;
}

function fmt2(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export function StepTotal({ state, dispatch, onAddItem, onGoReview }: StepTotalProps) {
  const cur = state.items[state.currentItemIndex];
  const labor = itemLaborTotal(cur);
  const mat = itemMaterialTotal(cur);
  const equip = itemEquipmentTotal(cur);
  const base = labor + mat + equip;
  const mult = cur.multiLocation && cur.locations.length > 1 ? cur.locations.length : 1;
  const sub = base * mult;
  const markup = sub * (cur.markup / 100);
  const total = sub + markup;

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 8 of 9 · Item Total</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          Set this item's price.
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          We've added it up — adjust the markup if your contract terms differ.
        </p>
      </div>

      <div className="bg-background border rounded-xl overflow-hidden mb-4 shadow-xs">
        <div className="flex justify-between items-center px-[18px] py-3 border-b">
          <span className="text-[0.82rem] text-foreground/80">Labor</span>
          <span className="font-mono text-[0.85rem] font-semibold text-foreground">{fmt2(labor)}</span>
        </div>
        <div className="flex justify-between items-center px-[18px] py-3 border-b">
          <span className="text-[0.82rem] text-foreground/80">Materials</span>
          <span className="font-mono text-[0.85rem] font-semibold text-foreground">{fmt2(mat)}</span>
        </div>
        <div className="flex justify-between items-center px-[18px] py-3 border-b">
          <span className="text-[0.82rem] text-foreground/80">Equipment</span>
          <span className="font-mono text-[0.85rem] font-semibold text-foreground">{fmt2(equip)}</span>
        </div>
        {mult > 1 && (
          <div className="flex justify-between items-center px-[18px] py-3 border-b">
            <span className="text-[0.82rem] text-foreground/80">× {mult} locations</span>
            <span className="font-mono text-[0.85rem] font-semibold text-foreground">{fmt2(sub)}</span>
          </div>
        )}
        <div className="flex justify-between items-center px-[18px] py-3 border-b bg-muted/30">
          <span className="text-[0.82rem] text-foreground/80">Overhead & Profit</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={cur.markup}
              onChange={e => dispatch({ type: 'SET_MARKUP', markup: parseFloat(e.target.value) || 0 })}
              className="font-mono text-[0.85rem] font-semibold text-foreground bg-background border rounded-md px-2 py-1 w-14 text-center"
            />
            <span className="text-[0.8rem] text-muted-foreground">%</span>
            <span className="font-mono text-[0.85rem] font-semibold text-foreground">{fmt2(markup)}</span>
          </div>
        </div>
        <div className="flex justify-between items-center px-[18px] py-4 bg-[hsl(var(--navy))]">
          <span className="text-[0.7rem] font-bold text-white/60 uppercase tracking-[1px]">Item Total</span>
          <span className="font-heading text-[1.6rem] font-black text-amber-400 tracking-tight">{fmt2(total)}</span>
        </div>
      </div>

      {/* Next options */}
      <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
        <button
          type="button"
          onClick={onAddItem}
          className="p-4 rounded-xl border-[1.5px] text-left bg-background border-border hover:border-amber-300 hover:bg-amber-50 transition-all"
        >
          <p className="text-[0.6rem] font-bold uppercase tracking-[1px] text-amber-700 mb-1">+ Add Another</p>
          <p className="font-heading text-[1.05rem] font-extrabold text-foreground tracking-tight">Add Another Item</p>
          <p className="text-[0.7rem] text-muted-foreground mt-0.5">Same CO, new location/scope. Cause & pricing carry over.</p>
        </button>
        <button
          type="button"
          onClick={onGoReview}
          className="p-4 rounded-xl border-[1.5px] text-left bg-amber-500 border-amber-500 hover:bg-amber-400 transition-all"
        >
          <p className="text-[0.6rem] font-bold uppercase tracking-[1px] text-[hsl(var(--navy))] mb-1">→ Continue</p>
          <p className="font-heading text-[1.05rem] font-extrabold text-[hsl(var(--navy))] tracking-tight">Go to Full Review</p>
          <p className="text-[0.7rem] text-[hsl(var(--navy))]/65 mt-0.5">Roll up all items, set routing, submit.</p>
        </button>
      </div>
    </div>
  );
}
