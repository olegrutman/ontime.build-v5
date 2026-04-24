import { Keyboard, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScopePickerMode = 'qa' | 'browse' | 'type';

interface StepCatalogModeSwitchProps {
  value: ScopePickerMode;
  onChange: (mode: ScopePickerMode) => void;
}

/**
 * Quiet inline switch: "Prefer to do it yourself? Type it · Browse catalog"
 * Renders below the Sasha card so QA stays the visible default action.
 */
export function StepCatalogModeSwitch({ value, onChange }: StepCatalogModeSwitchProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground py-1">
      {value !== 'qa' && (
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
      <span aria-hidden className="opacity-40">·</span>
      <button
        type="button"
        onClick={() => onChange('browse')}
        className={cn(
          'inline-flex items-center gap-1 hover:text-foreground hover:underline transition-colors',
          value === 'browse' && 'text-foreground font-semibold underline'
        )}
      >
        <LayoutGrid className="h-3 w-3" /> Browse catalog
      </button>
    </div>
  );
}
