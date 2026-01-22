import { WorkItemData } from './WorkItemPage';
import { DollarSign, MapPin, Calendar, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface WorkItemDetailsProps {
  workItem: WorkItemData;
  canViewFinancials: boolean;
}

export function WorkItemDetails({ workItem, canViewFinancials }: WorkItemDetailsProps) {
  const formatCurrency = (amount?: number | null) => {
    if (!amount) return 'Not priced';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Details
      </h3>

      {/* Contract Amount - only if allowed to view financials */}
      {canViewFinancials && (
        <>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm">Contract Amount</span>
            </div>
            <span className="text-xl font-bold">
              {formatCurrency(workItem.amount)}
            </span>
          </div>
          <Separator />
        </>
      )}

      {/* Description */}
      {workItem.description && (
        <>
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-1">Description</h4>
            <p className="text-sm leading-relaxed">{workItem.description}</p>
          </div>
          <Separator />
        </>
      )}

      {/* Location */}
      {workItem.location_ref && (
        <>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{workItem.location_ref}</span>
          </div>
          <Separator />
        </>
      )}

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Created</span>
          </div>
          <p className="text-sm font-medium">{formatDate(workItem.created_at)}</p>
        </div>
        <div>
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Updated</span>
          </div>
          <p className="text-sm font-medium">{formatDate(workItem.updated_at)}</p>
        </div>
      </div>
    </div>
  );
}
