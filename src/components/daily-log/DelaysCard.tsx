import { useState, useEffect } from 'react';
import { Minus, Plus, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DELAY_CAUSES } from '@/types/dailyLog';

interface DelayEntry {
  cause: string;
  hours_lost: number;
  notes?: string;
}

interface DelaysCardProps {
  delays: DelayEntry[];
  onChange: (delays: DelayEntry[]) => void;
  disabled?: boolean;
}

export function DelaysCard({ delays, onChange, disabled }: DelaysCardProps) {
  const [local, setLocal] = useState<DelayEntry[]>(delays);

  useEffect(() => {
    setLocal(delays);
  }, [delays]);

  const totalHours = local.reduce((sum, d) => sum + d.hours_lost, 0);

  const toggleCause = (cause: string) => {
    if (disabled) return;
    const exists = local.find(d => d.cause === cause);
    let next: DelayEntry[];
    if (exists) {
      next = local.filter(d => d.cause !== cause);
    } else {
      next = [...local, { cause, hours_lost: 1 }];
    }
    setLocal(next);
    onChange(next);
  };

  const adjustHours = (cause: string, delta: number) => {
    if (disabled) return;
    const next = local.map(d =>
      d.cause === cause ? { ...d, hours_lost: Math.max(0.5, d.hours_lost + delta) } : d
    );
    setLocal(next);
    onChange(next);
  };

  return (
    <div className="bg-card rounded-2xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Delays
        </h3>
        {totalHours > 0 && (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{totalHours}h lost</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {DELAY_CAUSES.map(cause => {
          const active = local.some(d => d.cause === cause);
          return (
            <button
              key={cause}
              onClick={() => toggleCause(cause)}
              disabled={disabled}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                active
                  ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
                  : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {cause}
            </button>
          );
        })}
      </div>
      {local.length > 0 && (
        <div className="space-y-2 pt-1">
          {local.map(d => (
            <div key={d.cause} className="flex items-center justify-between py-1">
              <span className="text-sm">{d.cause}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={disabled || d.hours_lost <= 0.5}
                  onClick={() => adjustHours(d.cause, -0.5)}
                  className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-sm hover:bg-accent disabled:opacity-30"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="text-sm font-semibold w-8 text-center">{d.hours_lost}h</span>
                <button
                  disabled={disabled}
                  onClick={() => adjustHours(d.cause, 0.5)}
                  className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-sm hover:bg-accent disabled:opacity-30"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
