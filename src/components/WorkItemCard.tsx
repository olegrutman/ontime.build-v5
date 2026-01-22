import { WorkItem, WORK_ITEM_TYPE_LABELS } from '@/types/workItem';
import { StateBadge } from './StateBadge';
import { TypeIndicator, TypeDot } from './TypeIndicator';
import { Card } from '@/components/ui/card';
import { MapPin, Users, ChevronRight, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkItemCardProps {
  item: WorkItem;
  depth?: number;
  onClick?: () => void;
  isSelected?: boolean;
}

export function WorkItemCard({ item, depth = 0, onClick, isSelected }: WorkItemCardProps) {
  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const locationString = [item.location?.structure, item.location?.floor, item.location?.area]
    .filter(Boolean)
    .join(' › ');

  return (
    <Card 
      className={cn(
        'group relative overflow-hidden transition-all duration-200 cursor-pointer',
        'hover:shadow-md hover:border-primary/20',
        isSelected && 'ring-2 ring-primary border-primary',
        depth > 0 && 'ml-8'
      )}
      onClick={onClick}
    >
      {/* Type indicator bar */}
      <div 
        className={cn(
          'absolute left-0 top-0 bottom-0 w-1',
          `type-${item.type.toLowerCase().replace('_', '-')}`
        )} 
        style={{
          backgroundColor: item.type === 'PROJECT' ? 'hsl(var(--type-project))' :
                          item.type === 'SOV_ITEM' ? 'hsl(var(--type-sov))' :
                          item.type === 'CHANGE_WORK' ? 'hsl(var(--type-change))' :
                          'hsl(var(--type-tm))'
        }}
      />
      
      <div className="p-4 pl-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center gap-3 mb-2">
              <TypeIndicator type={item.type} size="sm" />
              <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {item.code}
              </code>
              <StateBadge state={item.state} size="sm" />
            </div>
            
            {/* Title */}
            <h3 className="font-semibold text-foreground truncate mb-1">
              {item.title}
            </h3>
            
            {/* Description */}
            {item.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mb-3">
                {item.description}
              </p>
            )}
            
            {/* Meta row */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {locationString && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[200px]">{locationString}</span>
                </div>
              )}
              {item.participants.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{item.participants.length}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right side - Amount and chevron */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm font-semibold">
                {item.amount ? (
                  <>
                    <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                    {formatCurrency(item.amount).replace('$', '')}
                  </>
                ) : (
                  <span className="text-muted-foreground italic">Unpriced</span>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {WORK_ITEM_TYPE_LABELS[item.type]}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
          </div>
        </div>
      </div>
    </Card>
  );
}
