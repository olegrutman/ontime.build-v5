import { useNavigate } from 'react-router-dom';
import { ChangeWork } from '@/types/changeWork';
import { WORK_ITEM_STATE_LABELS } from '@/types/workItem';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StateBadge } from '@/components/StateBadge';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, AlertCircle, ExternalLink } from 'lucide-react';

interface ChangeWorkCardProps {
  changeWork: ChangeWork;
  onClick: () => void;
  isSelected?: boolean;
}

export function ChangeWorkCard({ changeWork, onClick, isSelected }: ChangeWorkCardProps) {
  const navigate = useNavigate();
  
  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleOpenDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/work-item/${changeWork.id}`);
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs font-mono shrink-0">
                {changeWork.code || 'CO-???'}
              </Badge>
              <StateBadge state={changeWork.state} size="sm" />
            </div>
            <h3 className="font-medium text-sm truncate">{changeWork.title}</h3>
            {changeWork.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {changeWork.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {changeWork.location_ref && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {changeWork.location_ref}
                </span>
              )}
              <span>
                {formatDistanceToNow(new Date(changeWork.created_at), { addSuffix: true })}
              </span>
            </div>
            {changeWork.rejection_notes && changeWork.state === 'OPEN' && (
              <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{changeWork.rejection_notes}</span>
              </div>
            )}
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <p className="font-semibold text-sm">{formatCurrency(changeWork.amount)}</p>
            <p className="text-xs text-muted-foreground">
              {changeWork.organization?.org_code}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs px-2"
              onClick={handleOpenDetail}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Open
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
