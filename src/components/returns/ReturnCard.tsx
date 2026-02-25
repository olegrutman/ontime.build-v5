import { Card, CardContent } from '@/components/ui/card';
import { ReturnStatusBadge } from './ReturnStatusBadge';
import { Return, UrgencyType, URGENCY_COLORS } from '@/types/return';
import { Badge } from '@/components/ui/badge';
import { Package, Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface ReturnCardProps {
  returnData: Return;
  onClick: () => void;
  canViewPricing: boolean;
}

export function ReturnCard({ returnData, onClick, canViewPricing }: ReturnCardProps) {
  const itemCount = returnData.return_items?.length ?? 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">{returnData.return_number}</span>
          <ReturnStatusBadge status={returnData.status} />
        </div>

        <p className="text-xs text-muted-foreground line-clamp-1">
          {returnData.reason}{returnData.wrong_type ? ` – ${returnData.wrong_type}` : ''}
        </p>

        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
          {returnData.pickup_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(returnData.pickup_date), 'MMM d')}
            </span>
          )}
          {returnData.urgency && returnData.urgency !== 'Standard' && (
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${URGENCY_COLORS[returnData.urgency as UrgencyType] || ''}`}>
              {returnData.urgency}
            </Badge>
          )}
        </div>

        {canViewPricing && returnData.status === 'PRICED' && (
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Net Credit: ${returnData.net_credit_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
