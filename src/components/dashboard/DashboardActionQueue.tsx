import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { FileText, Package, Wrench, ChevronRight } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

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

const TYPE_ICON: Record<string, React.ElementType> = {
  invoice: FileText,
  purchase_order: Package,
  change_order: Wrench,
};

const TYPE_COLOR: Record<string, string> = {
  invoice: 'text-blue-600 dark:text-blue-400',
  purchase_order: 'text-emerald-600 dark:text-emerald-400',
  change_order: 'text-amber-600 dark:text-amber-400',
};

export function DashboardActionQueue({ docs }: DashboardActionQueueProps) {
  const navigate = useNavigate();
  const items = docs.slice(0, 5);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-border/60 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Recent Activity</h3>
      </div>
      <div className="divide-y divide-border/40">
        {items.map((item) => {
          const Icon = TYPE_ICON[item.type] || FileText;
          const color = TYPE_COLOR[item.type] || 'text-muted-foreground';
          const tabMap: Record<string, string> = {
            invoice: 'invoices',
            purchase_order: 'purchase-orders',
            change_order: 'change-orders',
          };
          const tab = tabMap[item.type] || 'overview';

          return (
            <button
              key={item.id}
              onClick={() => navigate(`/project/${item.projectId}/${tab}?highlight=${item.id}`)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/40 transition-colors text-left"
            >
              <Icon className={cn('w-4 h-4 shrink-0', color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.projectName} · {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
              </div>
              {item.amount != null && item.amount > 0 && (
                <span className="text-xs font-semibold text-muted-foreground shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {formatCurrency(item.amount)}
                </span>
              )}
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
