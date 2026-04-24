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
          className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors',
            isAi
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-200'
              : 'bg-muted text-foreground hover:bg-muted/70'
          )}
        >
          {isAi && <Sparkles className="h-2.5 w-2.5" />}
          {!isAi && value != null && <Pencil className="h-2.5 w-2.5" />}
          {value != null ? `${value} ${unit}` : `Set ${unit}`}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-3 space-y-2">
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
