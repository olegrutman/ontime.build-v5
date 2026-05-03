import { useState } from 'react';
import type { PickerState, PickerAction } from './types';
import { locationDisplay } from './types';
import { VoiceInputButton } from '@/components/VoiceInputButton';

interface StepScopeProps {
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

export function StepScope({ state, dispatch }: StepScopeProps) {
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
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 6 of 9 · Scope Description</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          Here's the scope description we drafted.
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Built from your picks. Edit the text directly or regenerate.
        </p>
      </div>

      {/* Regenerate button */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button
          type="button"
          onClick={handleRegenerate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border text-[0.72rem] font-semibold text-muted-foreground hover:bg-amber-50 hover:border-amber-300 hover:text-foreground transition-all"
        >
          ↻ Regenerate
        </button>
      </div>

      {/* Narrative box */}
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

      {/* Attachments — coming soon */}
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
