import { useDemoProjectData } from '@/hooks/useDemoData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  answered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  closed: 'bg-muted text-muted-foreground',
};

const PRIORITY_ICON = {
  high: <AlertTriangle className="h-3.5 w-3.5 text-red-500" />,
  medium: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
  low: <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />,
};

export function DemoRFIsTab() {
  const data = useDemoProjectData();
  if (!data) return null;

  const { rfis } = data;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">RFIs</h2>

      <div className="flex gap-2">
        {['open', 'answered', 'closed'].map(status => {
          const count = rfis.filter(r => r.status === status).length;
          if (count === 0) return null;
          return (
            <Badge key={status} variant="outline" className="text-xs">
              {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
            </Badge>
          );
        })}
      </div>

      <div className="grid gap-3">
        {rfis.map(rfi => (
          <Card key={rfi.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {PRIORITY_ICON[rfi.priority]}
                  <CardTitle className="text-sm font-medium">
                    {rfi.rfi_number}: {rfi.subject}
                  </CardTitle>
                </div>
                <Badge className={STATUS_STYLES[rfi.status]}>
                  {rfi.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <p>{rfi.question}</p>
              <div className="flex gap-4 pt-1">
                <span>From: {rfi.created_by}</span>
                <span>To: {rfi.assigned_to}</span>
                {rfi.answered_at && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-3 w-3" /> Answered
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
