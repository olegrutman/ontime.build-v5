import { cn } from '@/lib/utils';
import type { PickerState, PickerAction, WorkTypeOption } from './types';

interface StepWorkProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
}

const SUGGESTED_WORK: WorkTypeOption[] = [
  { id: 'remove', label: 'Remove existing framing', meta: '~4 hr · 2 carp · joist demo', suggested: true },
  { id: 'lvl', label: 'Add header / install LVL', meta: '~3 hr · 2 carp · 1 LVL', suggested: true },
  { id: 'hangers', label: 'Install hangers / straps', meta: '~1.5 hr · 1 carp · 6 hangers', suggested: true },
  { id: 'modify', label: 'Modify joist bay', meta: '~2 hr · 2 carp · widen / deepen', suggested: true },
  { id: 'ceiling', label: 'Patch ceiling below', meta: 'By others or +2 hr · 1 carp', suggested: true },
];

const OTHER_WORK: WorkTypeOption[] = [
  { id: 'notch', label: 'Cut / notch joists', meta: '~1.5 hr · 1 carp' },
  { id: 'sister', label: 'Sister joists / reinforce', meta: '~3 hr · 1 carp' },
  { id: 'block', label: 'Add blocking / bridging', meta: '~1.5 hr · 1 carp' },
  { id: 'subfloor', label: 'Repair / replace subfloor', meta: '~4 hr · 2 carp' },
];

export function StepWork({ state, dispatch }: StepWorkProps) {
  const cur = state.items[state.currentItemIndex];

  const renderPill = (wt: WorkTypeOption) => {
    const selected = cur.workTypes.has(wt.id);
    return (
      <button
        key={wt.id}
        type="button"
        onClick={() => dispatch({ type: 'TOGGLE_WORK_TYPE', workTypeId: wt.id, workTypeName: wt.label })}
        className={cn(
          'flex items-start gap-2.5 p-3 rounded-xl border-[1.5px] text-left transition-all relative',
          selected
            ? 'bg-amber-50 border-amber-400'
            : 'bg-background border-border hover:border-amber-300',
        )}
      >
        <span
          className={cn(
            'w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center text-[0.75rem] font-bold shrink-0 mt-0.5 transition-all',
            selected
              ? 'bg-amber-500 border-amber-500 text-white'
              : 'bg-background border-muted-foreground/40 text-transparent',
          )}
        >
          ✓
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[0.82rem] font-semibold text-foreground leading-tight">
            {wt.label}
            {wt.suggested && <span className="text-amber-500 text-[0.7rem] ml-1">★</span>}
          </p>
          <p className="text-[0.65rem] text-muted-foreground mt-0.5">{wt.meta}</p>
        </div>
      </button>
    );
  };

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 5 of 9 · Work Types</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          What work needs to be done?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Pick all that apply. ★ items are suggested based on your cause and system.
        </p>
      </div>

      <div className="mb-4">
        <p className="text-[0.7rem] font-semibold text-foreground/80 mb-2 flex items-center gap-2">
          <span className="text-[0.55rem] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-[0.5px]">★ Suggested</span>
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
          {SUGGESTED_WORK.map(renderPill)}
        </div>
      </div>

      <div>
        <p className="text-[0.7rem] font-semibold text-foreground/80 mb-2 flex items-center gap-2">
          <span className="text-[0.55rem] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-[0.5px]">Other floor system work</span>
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
          {OTHER_WORK.map(renderPill)}
        </div>
      </div>
    </div>
  );
}
