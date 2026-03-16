import { WorkOrderLineItem } from '@/hooks/useWorkOrderLineItems';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks, MapPin } from 'lucide-react';

interface WorkOrderLineItemsListProps {
  lineItems: WorkOrderLineItem[];
  isLoading: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted-foreground',
  submitted: 'bg-blue-500',
  approved: 'bg-green-500',
  rejected: 'bg-destructive',
};

export function WorkOrderLineItemsList({ lineItems, isLoading }: WorkOrderLineItemsListProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Line Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        </CardContent>
      </Card>
    );
  }

  if (lineItems.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ListChecks className="w-4 h-4" />
            Line Items
            <Badge variant="secondary" className="text-xs">{lineItems.length}</Badge>
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {lineItems.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border bg-card p-3 space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_COLORS[item.status] || 'bg-muted-foreground'}`} />
                <span className="text-sm font-medium truncate">{item.item_name}</span>
              </div>
              {item.qty != null && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {item.qty} {item.unit}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {item.division && (
                <Badge variant="outline" className="text-xs">{item.division}</Badge>
              )}
              {item.category_name && (
                <Badge variant="secondary" className="text-xs">{item.category_name}</Badge>
              )}
              {item.location_tag && (
                <Badge variant="outline" className="text-xs gap-1">
                  <MapPin className="w-3 h-3" /> {item.location_tag}
                </Badge>
              )}
            </div>

            {item.note && (
              <p className="text-xs text-muted-foreground line-clamp-2">{item.note}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
