import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';

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

interface DashboardActivityFeedProps {
  docs: RecentDoc[];
}

const TYPE_COLORS: Record<string, string> = {
  invoice: 'bg-red-100 text-red-700',
  work_order: 'bg-blue-100 text-blue-700',
  purchase_order: 'bg-green-100 text-green-700',
  change_order: 'bg-amber-100 text-amber-700',
};

function getInitials(label: string): string {
  const parts = label.split(/[-\s]/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

export function DashboardActivityFeed({ docs }: DashboardActivityFeedProps) {
  const items = useMemo(() => docs.slice(0, 8), [docs]);

  if (items.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="card-section-title">Recent Activity</h3>
      </div>
      <div className="px-3.5 pb-3 space-y-1">
        {items.map((item, i) => {
          const chipStyle = TYPE_COLORS[item.type] || 'bg-muted text-muted-foreground';
          const timeAgo = formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true });

          return (
            <div
              key={item.id}
              className="flex items-start gap-2.5 px-1 py-2 opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
              style={{ animationDelay: `${400 + i * 50}ms` }}
            >
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[9px] font-bold text-muted-foreground">{getInitials(item.label)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{item.label}</span>{' '}
                  updated in {item.projectName}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${chipStyle}`}>
                    {item.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50">{timeAgo}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
