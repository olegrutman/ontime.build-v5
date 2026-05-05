import { useState } from 'react';
import type { PickerState, PickerAction } from './types';
import { locationDisplay } from './types';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import { ScopeCatalogBrowser } from './ScopeCatalogBrowser';

interface StepScopeCombinedProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
}

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

      {/* ── WORK TYPES (catalog-driven) ─────────────────── */}
      <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[1.4px] mb-2.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
        Work Types
      </p>

      <ScopeCatalogBrowser state={state} dispatch={dispatch} />

      {/* ── SCOPE DESCRIPTION ────────────────────────────── */}
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
