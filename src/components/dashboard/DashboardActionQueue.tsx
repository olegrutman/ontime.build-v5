import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="rounded-3xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-border/40">
        <h3 className="text-lg font-semibold tracking-tight">Needs action today</h3>
        <p className="text-sm text-muted-foreground">Only the next things that move money or schedule</p>
      </div>
      <div className="p-4 space-y-3">
        {visibleItems.map((item) => {
          const tab = tabMap[item.type] || 'overview';
          return (
            <button
              key={item.id}
              onClick={() => navigate(`/project/${item.projectId}/${tab}?highlight=${item.id}`)}
              className="w-full rounded-2xl border border-border/60 px-4 py-3 flex items-center justify-between bg-accent/30 hover:bg-accent/60 transition-colors text-left"
            >
              <span className="text-sm font-medium truncate">{item.title}</span>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">Open</span>
            </button>
          );
        })}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 text-sm text-primary font-medium hover:bg-accent/30 transition-colors flex items-center justify-center gap-1 border-t border-border/40"
        >
          {expanded ? 'Show less' : `Show all (${allItems.length})`}
          <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
        </button>
      )}
    </div>
  );
}
