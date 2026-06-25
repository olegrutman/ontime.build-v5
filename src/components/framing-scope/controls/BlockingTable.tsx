import { cn } from '@/lib/utils';
import type { BlockingStatus } from '@/types/framingScope';

interface BlockingItem {
  key: string;
  label: string;
  note?: string;
  defaultStatus?: BlockingStatus;
}

interface BlockingTableProps {
  label: string;
  items: BlockingItem[];
  values: Record<string, BlockingStatus>;
  onChange: (values: Record<string, BlockingStatus>) => void;
}

export function BlockingTable({ label, items, values, onChange }: BlockingTableProps) {
  const toggle = (key: string) => {
    const current = values[key] ?? 'IN';
    onChange({ ...values, [key]: current === 'IN' ? 'EX' : 'IN' });
  };

  return (
    <div className="py-3 px-1 animate-fade-in">
      <p className="text-sm font-medium text-foreground mb-2">{label}</p>
      <div className="rounded-md border border-border overflow-hidden">
        {items.map((item, i) => {
          const status = values[item.key] ?? item.defaultStatus ?? 'IN';
          return (
            <div
              key={item.key}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm',
                i < items.length - 1 && 'border-b border-border/50',
                status === 'EX' && 'opacity-60'
              )}
            >
              <div className="flex-1 min-w-0">
                <span className={cn(status === 'EX' && 'line-through text-muted-foreground')}>
                  {item.label}
                </span>
                {item.note && <p className="text-xs text-muted-foreground">{item.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => toggle(item.key)}
                className={cn(
                  'px-2.5 py-0.5 text-xs font-semibold rounded-full border transition-all shrink-0',
                  status === 'IN'
                    ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-600 border-red-400/30'
                )}
              >
                {status}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
