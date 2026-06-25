import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ACTION_TYPE_LABELS } from '@/types/platform';
import type { BreakdownItem, RecentLog } from '@/hooks/usePlatformMetrics';
import type { SupportActionType } from '@/types/platform';

function BreakdownList({ title, items }: { title: string; items: BreakdownItem[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => {
          const pct = total > 0 ? (item.count / total) * 100 : 0;
          return (
            <div key={item.label} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="capitalize truncate">{item.label.toLowerCase().replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground font-medium">{item.count}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/30">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">No data</p>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivity({ logs }: { logs: RecentLog[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Recent Platform Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 text-xs">
              <div className="shrink-0 mt-0.5">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {ACTION_TYPE_LABELS[log.action_type as SupportActionType] || log.action_type}
                </Badge>
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-foreground">
                  {log.action_summary || log.action_type}
                </p>
                <p className="text-muted-foreground">
                  {log.created_by_name || log.created_by_email || 'System'}
                  {log.target_org_name ? ` → ${log.target_org_name}` : ''}
                </p>
              </div>
              <span className="text-muted-foreground shrink-0">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-xs text-muted-foreground">No recent activity</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface Props {
  orgsByType: BreakdownItem[];
  projectsByStatus: BreakdownItem[];
  invoicesByStatus: BreakdownItem[];
  recentLogs: RecentLog[];
}

export function PlatformBreakdowns({ orgsByType, projectsByStatus, invoicesByStatus, recentLogs }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BreakdownList title="Organizations by Type" items={orgsByType} />
        <BreakdownList title="Projects by Status" items={projectsByStatus} />
        <BreakdownList title="Invoices by Status" items={invoicesByStatus} />
      </div>
      <RecentActivity logs={recentLogs} />
    </div>
  );
}
