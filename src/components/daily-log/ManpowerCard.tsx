import { useState, useEffect } from 'react';
import { Minus, Plus, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManpowerEntry {
  org_id?: string | null;
  trade: string;
  headcount: number;
}

interface ManpowerCardProps {
  entries: ManpowerEntry[];
  projectTrades: { org_id: string | null; trade: string }[];
  onChange: (entries: ManpowerEntry[]) => void;
  disabled?: boolean;
}

export function ManpowerCard({ entries, projectTrades, onChange, disabled }: ManpowerCardProps) {
  // Initialize from project trades if empty
  const [local, setLocal] = useState<ManpowerEntry[]>(() => {
    if (entries.length > 0) return entries;
    return projectTrades.map(t => ({ org_id: t.org_id, trade: t.trade, headcount: 0 }));
  });

  useEffect(() => {
    if (entries.length > 0) setLocal(entries);
  }, [entries]);

  const total = local.reduce((sum, e) => sum + e.headcount, 0);

  const updateCount = (idx: number, delta: number) => {
    if (disabled) return;
    const updated = local.map((e, i) =>
      i === idx ? { ...e, headcount: Math.max(0, e.headcount + delta) } : e
    );
    setLocal(updated);
    onChange(updated);
  };

  return (
    <div className="bg-card rounded-2xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" /> Manpower
        </h3>
        <span className="text-sm font-semibold">{total} total</span>
      </div>
      <div className="space-y-2">
        {local.map((entry, idx) => (
          <div key={idx} className="flex items-center justify-between py-1.5">
            <span className="text-sm truncate flex-1">{entry.trade || 'General'}</span>
            <div className="flex items-center gap-2">
              <button
                disabled={disabled || entry.headcount === 0}
                onClick={() => updateCount(idx, -1)}
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center transition-colors',
                  'bg-muted hover:bg-accent disabled:opacity-30'
                )}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm font-semibold w-6 text-center">{entry.headcount}</span>
              <button
                disabled={disabled}
                onClick={() => updateCount(idx, 1)}
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center transition-colors',
                  'bg-muted hover:bg-accent disabled:opacity-30'
                )}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {local.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No trades on this project yet</p>
        )}
      </div>
    </div>
  );
}
