import { cn } from '@/lib/utils';

interface Props {
  total: number;
  activeCount: number;
  inactiveCount: number;
  unpricedCount: number;
  uncategorizedCount: number;
  manufacturerCount: number;
  onSelectStatus: (status: 'all' | 'active' | 'inactive' | 'unpriced' | 'uncategorized') => void;
  activeStatus: string;
}

export function CatalogHealthStrip({
  total,
  activeCount,
  inactiveCount,
  unpricedCount,
  uncategorizedCount,
  manufacturerCount,
  onSelectStatus,
  activeStatus,
}: Props) {
  const tiles = [
    { key: 'all' as const, label: 'Products', value: total, tone: 'text-foreground' },
    { key: 'active' as const, label: 'Active', value: activeCount, tone: 'text-foreground' },
    { key: 'inactive' as const, label: 'Retired', value: inactiveCount, tone: 'text-muted-foreground' },
    { key: 'unpriced' as const, label: 'No price', value: unpricedCount, tone: unpricedCount > 0 ? 'text-destructive' : 'text-foreground' },
    { key: 'uncategorized' as const, label: 'Uncategorized', value: uncategorizedCount, tone: uncategorizedCount > 0 ? 'text-primary' : 'text-foreground' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {tiles.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onSelectStatus(t.key)}
          className={cn(
            'text-left bg-card border rounded-2xl px-3 py-2.5 transition-colors hover:bg-accent/50',
            activeStatus === t.key ? 'border-primary' : 'border-border',
          )}
        >
          <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{t.label}</div>
          <div className={cn('font-mono text-lg font-bold leading-tight', t.tone)}>{t.value}</div>
        </button>
      ))}
      <div className="bg-card border border-border rounded-2xl px-3 py-2.5">
        <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Manufacturers</div>
        <div className="font-mono text-lg font-bold leading-tight text-foreground">{manufacturerCount}</div>
      </div>
    </div>
  );
}
