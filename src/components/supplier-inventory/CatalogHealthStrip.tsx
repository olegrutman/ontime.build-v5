import { AlertTriangle, Tags, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

type Status = 'all' | 'active' | 'inactive' | 'unpriced' | 'uncategorized';

interface Props {
  activeCount: number;
  unpricedCount: number;
  uncategorizedCount: number;
  onSelectStatus: (status: Status) => void;
  activeStatus: string;
}

/** One headline number (active products) plus actionable cleanup alerts. */
export function CatalogHealthStrip({ activeCount, unpricedCount, uncategorizedCount, onSelectStatus, activeStatus }: Props) {
  const alerts = [
    { key: 'unpriced' as const, label: 'need a price', value: unpricedCount, icon: AlertTriangle, tone: 'text-destructive border-destructive/40' },
    { key: 'uncategorized' as const, label: 'uncategorized', value: uncategorizedCount, icon: Tags, tone: 'text-primary border-primary/40' },
  ].filter((a) => a.value > 0);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
      <button
        type="button"
        onClick={() => onSelectStatus('active')}
        className={cn(
          'flex items-center gap-3 text-left bg-card border rounded-2xl px-4 py-3 transition-colors hover:bg-accent/50',
          activeStatus === 'active' ? 'border-primary' : 'border-border',
        )}
      >
        <Package className="h-5 w-5 shrink-0 text-primary" />
        <div>
          <div className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Active products</div>
          <div className="font-mono text-2xl font-bold leading-tight text-foreground">{activeCount.toLocaleString()}</div>
        </div>
      </button>
      {alerts.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a) => (
            <button
              key={a.key}
              type="button"
              onClick={() => onSelectStatus(a.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent/50',
                a.tone,
                activeStatus === a.key && 'ring-1 ring-current',
              )}
            >
              <a.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="font-mono font-bold">{a.value.toLocaleString()}</span> {a.label}
            </button>
          ))}
        </div>
      ) : (
        activeCount > 0 && <p className="text-xs text-muted-foreground">Every active product has a price and category.</p>
      )}
    </div>
  );
}
