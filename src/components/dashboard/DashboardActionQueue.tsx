import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardFooter } from '@/components/ui/surface-card';
import { CollapseToggle } from '@/components/ui/collapse-toggle';

interface RecentDoc {
  id: string;
  type: string;
  title: string;
  status: string;
  amount: number | null;
  created_at: string;
  projectName: string;
  projectId: string;
}

interface DashboardActionQueueProps {
  docs: RecentDoc[];
}

export function DashboardActionQueue({ docs }: DashboardActionQueueProps) {
  const navigate = useNavigate();
  const allItems = docs.slice(0, 8);
  const [expanded, setExpanded] = useState(false);

  if (allItems.length === 0) return null;

  const visibleItems = expanded ? allItems : allItems.slice(0, 3);
  const hasMore = allItems.length > 3;

  const tabMap: Record<string, string> = {
    invoice: 'invoices',
    purchase_order: 'purchase-orders',
    change_order: 'change-orders',
  };

  return (
    <SurfaceCard>
      <SurfaceCardHeader
        title="Needs action today"
        subtitle="Only the next things that move money or schedule"
      />
      <div className="px-5 py-3 space-y-2">
        {visibleItems.map((item) => {
          const tab = tabMap[item.type] || 'overview';
          return (
            <button
              key={item.id}
              onClick={() => navigate(`/project/${item.projectId}/${tab}?highlight=${item.id}`)}
              className="w-full rounded-xl border border-border/60 px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-accent/20 hover:bg-accent/40 transition-colors text-left"
            >
              <span className="text-[0.85rem] font-medium truncate">{item.title}</span>
              <span className="text-[0.7rem] text-muted-foreground shrink-0 ml-2">Open</span>
            </button>
          );
        })}
      </div>
      {hasMore && (
        <SurfaceCardFooter>
          <CollapseToggle expanded={expanded} totalCount={allItems.length} onToggle={() => setExpanded(!expanded)} />
        </SurfaceCardFooter>
      )}
    </SurfaceCard>
  );
}
