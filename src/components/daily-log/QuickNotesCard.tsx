import { useState } from 'react';
import { cn } from '@/lib/utils';
import { QUICK_NOTE_CHIPS } from '@/types/dailyLog';
import { StickyNote } from 'lucide-react';

interface QuickNotesCardProps {
  notes: string;
  onChange: (notes: string) => void;
  disabled?: boolean;
}

export function QuickNotesCard({ notes, onChange, disabled }: QuickNotesCardProps) {
  const addChip = (chip: string) => {
    if (disabled) return;
    const separator = notes.trim() ? '. ' : '';
    onChange(notes.trim() + separator + chip);
  };

  return (
    <div className="bg-card rounded-2xl border p-4 space-y-3">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
        <StickyNote className="h-3.5 w-3.5" /> Notes
      </h3>
      <div className="flex flex-wrap gap-2">
        {QUICK_NOTE_CHIPS.map(chip => (
          <button
            key={chip}
            onClick={() => addChip(chip)}
            disabled={disabled}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {chip}
          </button>
        ))}
      </div>
      <textarea
        value={notes}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Tap chips above or type here..."
        rows={2}
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none disabled:opacity-50"
      />
    </div>
  );
}
