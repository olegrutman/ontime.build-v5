import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PickerState, PickerAction } from './types';
import { SectionLabel } from './sharedPicker';
import { SYSTEMS, SCOPES } from './catalog';

interface StepScopeProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
}

export function StepScope({ state, dispatch }: StepScopeProps) {
  const cur = state.items[state.currentItemIndex];

  const sys = cur.system ? SYSTEMS[cur.system] : null;
  const scopeOptions = (sys?.scopes ?? []).map((id) => SCOPES[id]).filter(Boolean);

  const toggle = (scopeId: string, label: string) => {
    dispatch({ type: 'TOGGLE_WORK_TYPE', workTypeId: scopeId, workTypeName: label });
  };

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">
          Step 3 of 6 · Scope
        </p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          What's the scope of work?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Pick one or more scope items. Only items valid for{' '}
          <span className="font-semibold text-foreground">{sys?.label ?? 'this system'}</span>{' '}
          are shown — each has a unit and the typical verbs you'd use.
        </p>
      </div>

      {!sys ? (
        <div className="flex items-start gap-2.5 p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="text-[0.8rem]">
            Pick a system first — that controls which scope items are available here.
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border">
            <span className="text-[0.62rem] font-bold text-muted-foreground uppercase tracking-[1.2px]">
              System
            </span>
            <span className="text-[0.78rem] font-bold text-foreground">{sys.label}</span>
            <span className="text-[0.66rem] font-mono text-muted-foreground">·</span>
            <span className="text-[0.66rem] font-mono text-muted-foreground">{sys.defaultTrade}</span>
          </div>

          <SectionLabel>Scope Items</SectionLabel>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
            {scopeOptions.map((sc) => {
              const selected = cur.workTypes.has(sc.id);
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => toggle(sc.id, sc.label)}
                  className={cn(
                    'flex flex-col gap-1.5 p-3 rounded-lg border-[1.5px] text-left min-h-[78px] transition-all relative',
                    selected
                      ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_3px_rgba(245,166,35,0.12)]'
                      : 'bg-background border-border hover:border-amber-300 hover:bg-amber-50',
                  )}
                >
                  {selected && (
                    <span className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[0.7rem] font-extrabold">
                      ✓
                    </span>
                  )}
                  <div className="flex items-center justify-between gap-2 pr-5">
                    <span className="text-[0.82rem] font-bold text-foreground leading-tight">
                      {sc.label}
                    </span>
                    <span className="text-[0.6rem] font-mono font-semibold bg-background border border-border px-1.5 py-0.5 rounded shrink-0">
                      {sc.unit}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {sc.verbs.map((vb) => (
                      <span
                        key={vb}
                        className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {vb}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {cur.workTypes.size > 0 && (
            <p className="mt-3 text-[0.7rem] font-semibold text-amber-700">
              {cur.workTypes.size} scope item{cur.workTypes.size !== 1 ? 's' : ''} selected
            </p>
          )}

          {cur.workTypes.size > 0 && (
            <div className="mt-5">
              <SectionLabel>Extra Labor Description (optional)</SectionLabel>
              <textarea
                value={cur.narrative}
                onChange={(e) => dispatch({ type: 'SET_NARRATIVE', narrative: e.target.value })}
                placeholder="Add anything the crew needs to know — access notes, sequencing, finishes, conditions, etc. Leave blank if not needed."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-[0.82rem] text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-amber-400 focus:ring-[3px] focus:ring-amber-400/15 resize-y leading-relaxed"
              />
              <p className="mt-1.5 text-[0.65rem] text-muted-foreground">
                Appended to every Labor line in this item. Materials &amp; Equipment have their own sections on the next page.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
