import { cn } from '@/lib/utils';
import type { PickerState, PickerAction } from './types';
import { CAUSES, Tile } from './sharedPicker';

interface StepCauseProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
}

export function StepCause({ state, dispatch }: StepCauseProps) {
  const cur = state.items[state.currentItemIndex];

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 3 of 5 · Cause</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          What caused the change?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Pick the root cause. This decides whether the document is a Change Order or Work Order.
        </p>
      </div>

      {CAUSES.map(group => (
        <div key={group.group} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('w-2 h-2 rounded-full shrink-0', group.groupColor)} />
            <span className="text-[0.74rem] font-bold text-foreground/80">{group.groupLabel}</span>
            <span className="text-[0.64rem] text-muted-foreground font-medium">{group.groupMeta}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
            {group.items.map(cause => (
              <Tile
                key={cause.id}
                selected={cur.causeId === cause.id}
                onClick={() => dispatch({
                  type: 'SET_CAUSE',
                  causeId: cause.id,
                  causeName: cause.label,
                  docType: cause.docType,
                  billable: cause.billable,
                  reason: cause.reason,
                })}
                icon={cause.icon}
                label={cause.label}
                sub={cause.sub}
                badge={cause.suggested ? '★ Common' : undefined}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Inference badges */}
      {cur.causeId && (
        <div className="flex flex-wrap gap-2 p-4 bg-gradient-to-br from-amber-50 to-amber-50/50 border border-amber-200 rounded-xl mt-2 animate-fade-in">
          <p className="w-full text-[0.62rem] font-bold text-amber-800 uppercase tracking-[1px] flex items-center gap-1.5">
            ✦ Based on your pick, we'll set this up as:
          </p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-amber-200 text-[0.74rem] font-semibold">
            <span className="text-muted-foreground text-[0.68rem]">Document</span>
            <span className="text-foreground">{cur.docType === 'CO' ? 'Change Order (CO)' : 'Work Order (WO)'}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-amber-200 text-[0.74rem] font-semibold">
            <span className="text-muted-foreground text-[0.68rem]">Billable</span>
            <span className="text-foreground">{cur.billable === 'yes' ? 'Yes' : cur.billable === 'maybe' ? 'Maybe' : 'No'}</span>
          </span>
        </div>
      )}
    </div>
  );
}
