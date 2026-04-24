import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Pencil, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuantityEditPopoverProps {
  value: number | null;
  unit: string;
  source: 'ai' | 'manual' | 'photo' | null;
  onChange: (next: number | null, source: 'ai' | 'manual') => void;
}

export function QuantityEditPopover({ value, unit, source, onChange }: QuantityEditPopoverProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string>(value != null ? String(value) : '');

  const isAi = source === 'ai';

  function commit() {
    const num = draft.trim() === '' ? null : Number(draft);
    if (num != null && Number.isNaN(num)) return;
    onChange(num, 'manual');
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(value != null ? String(value) : ''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={value != null ? `Edit quantity (${value} ${unit})` : `Set quantity in ${unit}`}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border-2 text-xs font-semibold transition-colors min-h-[32px]',
            isAi
              ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 hover:bg-amber-100'
              : value != null
                ? 'border-border bg-card text-foreground hover:bg-muted'
                : 'border-dashed border-muted-foreground/40 bg-card text-muted-foreground hover:border-primary hover:text-foreground'
          )}
        >
          {isAi && <Sparkles className="h-3 w-3" />}
          {value != null ? (
            <>
              <span className="tabular-nums">{value}</span>
              <span className="opacity-70">{unit}</span>
              <Pencil className="h-3 w-3 opacity-60" />
            </>
          ) : (
            <>
              <Pencil className="h-3 w-3" />
              <span>Set qty ({unit})</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-3 space-y-2">
        <div>
          <p className="text-xs font-semibold text-foreground">Quantity ({unit})</p>
          {isAi && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Editing flips this to manual</p>
          )}
        </div>
        <Input
          type="number"
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" onClick={commit} className="bg-amber-600 hover:bg-amber-700 text-white">Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
