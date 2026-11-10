import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AttentionItem {
  key: string;
  label: string;
  icon: ReactNode;
  /** 'alert' = needs action now, 'info' = status only. */
  tone: 'alert' | 'info';
  content: ReactNode;
}

/**
 * Compact row of tappable status chips that replaces stacked full-width
 * cards at the top of a CO/WO. Only one panel opens at a time.
 */
export function COAttentionChips({ items }: { items: AttentionItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!items.length) return null;
  const active = items.find(i => i.key === open);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map(item => {
          const isOpen = open === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : item.key)}
              className={cn(
                'inline-flex min-h-9 max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                item.tone === 'alert'
                  ? 'border-secondary/40 bg-secondary/10 text-foreground hover:bg-secondary/20'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted',
                isOpen && 'ring-2 ring-ring/30',
              )}
            >
              <span className={cn('shrink-0', item.tone === 'alert' ? 'text-secondary' : 'text-muted-foreground')}>{item.icon}</span>
              <span className="min-w-0 break-words text-left">{item.label}</span>
              <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', isOpen && 'rotate-180')} />
            </button>
          );
        })}
      </div>
      {active && <div className="space-y-3 animate-in fade-in-0 slide-in-from-top-1">{active.content}</div>}
    </div>
  );
}
