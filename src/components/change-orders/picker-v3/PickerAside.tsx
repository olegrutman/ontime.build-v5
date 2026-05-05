import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import type { PickerState } from './types';
import { itemSubtotal, grandTotal, locationShort, itemLaborTotal, itemMaterialTotal, itemEquipmentTotal } from './types';

interface PickerAsideProps {
  state: PickerState;
  onSwitchItem: (index: number) => void;
  onAddItem: () => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  canGoBack: boolean;
}

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('en-US');
}

export function PickerAside({
  state, onSwitchItem, onAddItem, onBack, onNext, onSubmit, canGoBack,
}: PickerAsideProps) {
  const isReview = state.step === 4;
  const cur = state.items[state.currentItemIndex];
  const total = grandTotal(state.items);
  const isGC = state.role === 'GC';

  return (
    <aside className="bg-background border-l flex flex-col sticky top-0 h-screen overflow-hidden">
      {/* Header */}
      <div className="px-[18px] py-3.5 border-b bg-muted/30">
        <p className="text-[0.58rem] font-bold text-muted-foreground uppercase tracking-[1.5px] mb-0.5">
          {cur.docType === 'CO' ? 'CO' : 'WO'}-DRAFT
        </p>
        <p className="font-heading text-[1.15rem] font-extrabold text-foreground leading-tight">
          Items in this {cur.docType === 'CO' ? 'CO' : 'WO'}
        </p>
      </div>

      {/* Scrollable items list */}
      <div className="flex-1 overflow-y-auto p-3.5">
        <div className="flex flex-col gap-1.5 mb-3">
          {state.items.map((item, i) => {
            const isActive = i === state.currentItemIndex && !isReview;
            const sub = itemSubtotal(item);
            const loc = locationShort(item);
            const configured = item.causeId && item.workTypes.size > 0;

            // Build descriptive work type names
            const workNames = [...item.workTypes]
              .map(k => item.workNames[k])
              .filter(Boolean);
            const workSummary = workNames.length > 0
              ? workNames.length <= 3
                ? workNames.join(', ')
                : workNames.slice(0, 2).join(', ') + ` +${workNames.length - 2} more`
              : 'No work types selected';

            return (
              <button
                key={i}
                type="button"
                onClick={() => onSwitchItem(i)}
                className={cn(
                  'p-2.5 rounded-lg text-left border transition-all relative',
                  isActive
                    ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_2px_rgba(245,166,35,0.15)]'
                    : 'bg-background border-border hover:border-amber-300',
                )}
              >
                <span className="absolute top-2 right-2 text-[0.55rem] font-extrabold text-muted-foreground font-mono">
                  #{i + 1}
                </span>
                <p className="text-[0.65rem] text-muted-foreground font-medium">
                  📍 {loc}{item.systemName ? ` · ${item.systemName}` : ''}
                </p>
                <p className="text-[0.7rem] text-foreground font-semibold mt-0.5">
                  {item.causeName ?? 'Not configured'}
                </p>
                <p className="text-[0.6rem] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                  {workSummary}
                </p>
                <p className="text-[0.55rem] text-muted-foreground/70 mt-0.5">
                  {item.pricingName}{!isGC && item.markup > 0 ? ` · ${item.markup}% markup` : ''}
                  {item.materials.length > 0 ? ` · ${item.materials.length} material${item.materials.length !== 1 ? 's' : ''}` : ''}
                </p>
                {configured && (
                  <p className="font-mono text-[0.78rem] font-bold text-foreground mt-1.5">
                    {fmt(sub)}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onAddItem}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 border-[1.5px] border-dashed border-muted-foreground/30 rounded-lg text-[0.74rem] font-semibold text-muted-foreground hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 transition-all"
        >
          <Plus className="h-3.5 w-3.5" /> Add another item
        </button>

        {/* Total panel */}
        <div className="bg-[hsl(var(--navy))] rounded-xl p-3.5 text-white mt-3">
          <p className="text-[0.6rem] text-white/50 uppercase tracking-[1.2px] mb-1">
            Total {cur.docType} Value
          </p>
          <p className="font-heading text-[1.95rem] font-black text-amber-400 leading-none tracking-tight">
            {fmt(total)}
          </p>
          <p className="text-[0.66rem] text-white/50 mt-1.5">
            {state.items.length} item{state.items.length !== 1 ? 's' : ''} · {cur.pricingName}
          </p>
          <div className="border-t border-white/10 mt-2.5 pt-2.5 space-y-1">
            <div className="flex justify-between text-[0.7rem] text-white/70">
              <span>Labor</span>
              <span className="font-semibold text-white">
                {fmt(state.items.reduce((s, it) => s + itemLaborTotal(it), 0))}
              </span>
            </div>
            <div className="flex justify-between text-[0.7rem] text-white/70">
              <span>Materials</span>
              <span className="font-semibold text-white">
                {fmt(state.items.reduce((s, it) => s + itemMaterialTotal(it), 0))}
              </span>
            </div>
            <div className="flex justify-between text-[0.7rem] text-white/70">
              <span>Equipment</span>
              <span className="font-semibold text-white">
                {fmt(state.items.reduce((s, it) => s + itemEquipmentTotal(it), 0))}
              </span>
            </div>
            {!isGC && (
              <div className="flex justify-between text-[0.7rem] text-white/70 border-t border-white/10 pt-1.5 mt-1">
                <span>Markup</span>
                <span className="font-semibold text-white">+{cur.markup}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="p-3.5 border-t bg-background flex gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[0.72rem] font-semibold bg-muted border border-border text-muted-foreground hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          ← Back
        </button>
        {isReview ? (
          <button
            type="button"
            onClick={onSubmit}
            className="flex-[2] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[0.84rem] font-bold bg-green-600 text-white hover:bg-green-700 shadow-sm transition-all"
          >
            ✓ Submit {cur.docType}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            className="flex-[2] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-[0.84rem] font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-sm transition-all"
          >
            Next →
          </button>
        )}
      </div>
    </aside>
  );
}
