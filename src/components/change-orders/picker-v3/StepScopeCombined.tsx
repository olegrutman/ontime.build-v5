import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { PickerState, PickerAction, WorkTypeOption } from './types';
import { locationDisplay } from './types';
import { VoiceInputButton } from '@/components/VoiceInputButton';

interface StepScopeCombinedProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
}

// ── Work type data ────────────────────────────────────────────────
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

function buildNarrative(state: PickerState): string {
  const cur = state.items[state.currentItemIndex];
  if (!cur.causeId || cur.workTypes.size === 0) return '';
  const loc = locationDisplay(cur);
  const sys = cur.systemName?.toLowerCase() ?? 'area';
  const verbs = [...cur.workTypes].map(k => cur.workNames[k]).filter(Boolean);
  const actions = verbs.length === 0 ? 'perform the required work'
    : verbs.length === 1 ? verbs[0].toLowerCase()
    : verbs.slice(0, -1).map(v => v.toLowerCase()).join(', ') + ', and ' + verbs[verbs.length - 1].toLowerCase();
  return `${cur.causeName} needs work in the ${sys} at ${loc}. We'll ${actions}, and leave the area ready for the next trade.`;
}

export function StepScopeCombined({ state, dispatch }: StepScopeCombinedProps) {
  const cur = state.items[state.currentItemIndex];
  const [generating, setGenerating] = useState(false);
  const narrative = cur.narrative || buildNarrative(state);

  const handleRegenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      dispatch({ type: 'SET_NARRATIVE', narrative: buildNarrative(state) });
      setGenerating(false);
    }, 800);
  };

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
        <span className={cn(
          'w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center text-[0.75rem] font-bold shrink-0 mt-0.5 transition-all',
          selected ? 'bg-amber-500 border-amber-500 text-white' : 'bg-background border-muted-foreground/40 text-transparent',
        )}>
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
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 2 of 4 · Scope</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          What work needs to be done?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Select work types and refine the scope description.
        </p>
      </div>

      {/* ── WORK TYPES ───────────────────────────────────────── */}
      <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[1.4px] mb-2.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
        Work Types
      </p>

      <div className="mb-3">
        <p className="text-[0.7rem] font-semibold text-foreground/80 mb-2 flex items-center gap-2">
          <span className="text-[0.55rem] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-[0.5px]">★ Suggested</span>
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
          {SUGGESTED_WORK.map(renderPill)}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-[0.7rem] font-semibold text-foreground/80 mb-2 flex items-center gap-2">
          <span className="text-[0.55rem] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-[0.5px]">Other floor system work</span>
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
          {OTHER_WORK.map(renderPill)}
        </div>
      </div>

      {/* ── SCOPE DESCRIPTION ────────────────────────────────── */}
      <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[1.4px] mb-2.5 mt-6 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
        Scope Description
      </p>

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          type="button"
          onClick={handleRegenerate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border text-[0.72rem] font-semibold text-muted-foreground hover:bg-amber-50 hover:border-amber-300 hover:text-foreground transition-all"
        >
          ↻ Regenerate
        </button>
        <VoiceInputButton
          onTranscript={(text) => {
            const current = cur.narrative || narrative;
            dispatch({ type: 'SET_NARRATIVE', narrative: current ? current + ' ' + text : text });
          }}
          size="md"
        />
      </div>

      <div className={`bg-background border-[1.5px] rounded-xl p-5 mb-3.5 relative ${generating ? 'animate-pulse' : ''}`}>
        <p className="text-[0.6rem] font-bold uppercase tracking-[1.2px] text-amber-700 mb-2 flex items-center gap-1.5">
          <span className="text-amber-500">✦</span> Auto-built scope · {cur.docType} format · Editable
        </p>
        <div
          contentEditable
          suppressContentEditableWarning
          onBlur={e => dispatch({ type: 'SET_NARRATIVE', narrative: e.currentTarget.textContent ?? '' })}
          className="text-[0.95rem] leading-relaxed text-foreground min-h-[80px] outline-none focus:bg-amber-50/30 focus:-mx-2 focus:px-2 focus:rounded transition-all"
        >
          {narrative}
        </div>
      </div>

      {/* Attachment stubs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { icon: '📷', label: 'Add Photos' },
          { icon: '📎', label: 'Attach RFI / Email' },
          { icon: '📍', label: 'Pin to Plan' },
        ].map(att => (
          <button
            key={att.label}
            type="button"
            disabled
            title="Coming soon"
            className="flex items-center gap-2 flex-1 justify-center px-3.5 py-2.5 rounded-lg bg-background border-[1.5px] border-dashed border-muted-foreground/20 text-[0.78rem] font-semibold text-muted-foreground/50 cursor-not-allowed relative"
          >
            <span className="text-base opacity-50">{att.icon}</span> {att.label}
            <span className="absolute -top-1.5 -right-1.5 text-[0.5rem] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full uppercase tracking-[0.5px]">Soon</span>
          </button>
        ))}
      </div>
    </div>
  );
}
