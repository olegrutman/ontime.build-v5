import { cn } from '@/lib/utils';

interface Pack {
  name: string;
  status: 'delivered' | 'ordered' | 'not_ordered' | 'partial';
  date: string;
}

interface PackProgressSectionProps {
  packs: Pack[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; width: string }> = {
  delivered: { label: 'Delivered', color: 'bg-emerald-500', width: 'w-full' },
  ordered: { label: 'Ordered', color: 'bg-blue-500', width: 'w-2/3' },
  not_ordered: { label: 'Not Ordered', color: 'bg-red-500', width: 'w-1/4' },
  partial: { label: 'Partially Matched', color: 'bg-amber-500', width: 'w-1/2' },
};

const STATUS_BADGE: Record<string, string> = {
  delivered: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
  ordered: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  not_ordered: 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
  partial: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
};

export function PackProgressSection({ packs }: PackProgressSectionProps) {
  if (packs.length === 0) return null;

  return (
    <div className="rounded-3xl bg-card border border-border/60 shadow-sm p-5">
      <h3 className="text-lg font-semibold tracking-tight">Pack progress</h3>
      <p className="text-sm text-muted-foreground">Ordered packs are also your schedule signal</p>
      <div className="mt-4 space-y-3">
        {packs.map((pack) => {
          const config = STATUS_CONFIG[pack.status] || STATUS_CONFIG.partial;
          const badge = STATUS_BADGE[pack.status] || STATUS_BADGE.partial;
          return (
            <div key={pack.name} className="rounded-2xl border border-border/60 p-4 bg-accent/20">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium truncate">{pack.name}</p>
                <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full shrink-0', badge)}>
                  {config.label}
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-accent overflow-hidden">
                <div className={cn('h-full rounded-full transition-all duration-700', config.color, config.width)} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{config.label}</span>
                <span>{pack.date}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
