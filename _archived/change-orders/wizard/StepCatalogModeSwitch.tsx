import { Keyboard, LayoutGrid, ArrowLeft, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScopePickerMode = 'qa' | 'browse' | 'type';

interface StepCatalogModeSwitchProps {
  value: ScopePickerMode;
  onChange: (mode: ScopePickerMode) => void;
}

/**
 * Quiet inline switch: QA is primary, "Type it" is secondary, browse is hidden behind a bottom link.
 * When browse IS active, a prominent "← Back to Sasha" button shows at the top.
 */
export function StepCatalogModeSwitch({ value, onChange }: StepCatalogModeSwitchProps) {
  // Browse mode: show a prominent back button
  if (value === 'browse') {
    return (
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange('qa')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-all dark:bg-amber-950/30 dark:border-amber-700 dark:text-amber-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Sasha
        </button>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Full Catalog</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground py-1">
      {value === 'type' && (
        <>
          <button
            type="button"
            onClick={() => onChange('qa')}
            className="font-semibold text-amber-700 dark:text-amber-400 hover:underline"
          >
            ← Back to Ask Sasha
          </button>
          <span aria-hidden className="opacity-40">·</span>
        </>
      )}
      <span>Prefer to do it yourself?</span>
      <button
        type="button"
        onClick={() => onChange('type')}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground hover:underline transition-colors',
          value === 'type' && 'text-foreground font-semibold underline'
        )}
      >
        <Keyboard className="h-3 w-3" /> Type it
      </button>
    </div>
  );
}

/**
 * Small escape-hatch link rendered at the bottom of QA mode to access the full browse catalog.
 */
export function BrowseCatalogLink({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="flex items-center justify-center pt-3 border-t mt-4">
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <LayoutGrid className="h-3 w-3" />
        Show full catalog
      </button>
    </div>
  );
}
