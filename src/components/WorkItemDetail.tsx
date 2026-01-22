import { WorkItem, WORK_ITEM_TYPE_LABELS } from '@/types/workItem';
import { StateBadge } from './StateBadge';
import { TypeIndicator } from './TypeIndicator';
import { StateProgressBar, StateProgressLabels } from './StateProgressBar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { X, MapPin, Users, Calendar, DollarSign, Building, ChevronRight } from 'lucide-react';

interface WorkItemDetailProps {
  item: WorkItem;
  onClose: () => void;
}

export function WorkItemDetail({ item, onClose }: WorkItemDetailProps) {
  const formatCurrency = (amount?: number) => {
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

  const locationParts = [item.location?.structure, item.location?.floor, item.location?.area].filter(Boolean);

  return (
    <Card className="h-full flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b">
        <div className="flex items-start gap-4">
          <TypeIndicator type={item.type} size="lg" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <code className="text-sm font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                {item.code}
              </code>
              <StateBadge state={item.state} />
            </div>
            <h2 className="text-xl font-bold">{item.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {WORK_ITEM_TYPE_LABELS[item.type]}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* State Progress */}
        <div>
          <h3 className="text-sm font-medium mb-3">Progress</h3>
          <StateProgressBar currentState={item.state} readonly />
          <StateProgressLabels />
        </div>

        <Separator />

        {/* Amount */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Contract Amount</span>
          </div>
          <span className="text-2xl font-bold">
            {formatCurrency(item.amount)}
          </span>
        </div>

        <Separator />

        {/* Description */}
        {item.description && (
          <>
            <div>
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
            <Separator />
          </>
        )}

        {/* Location */}
        {locationParts.length > 0 && (
          <>
            <div>
              <h3 className="text-sm font-medium mb-3">Location</h3>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <div className="flex items-center gap-1 text-sm">
                  {locationParts.map((part, index) => (
                    <span key={index} className="flex items-center gap-1">
                      {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                      <span className={index === locationParts.length - 1 ? 'font-medium' : 'text-muted-foreground'}>
                        {part}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Participants */}
        {item.participants.length > 0 && (
          <>
            <div>
              <h3 className="text-sm font-medium mb-3">Participants</h3>
              <div className="space-y-3">
                {item.participants.map(participant => (
                  <div 
                    key={participant.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-full">
                      <Building className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{participant.organization}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {participant.role.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
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
            <p className="text-sm font-medium">{formatDate(item.created_at)}</p>
          </div>
          <div>
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Updated</span>
            </div>
            <p className="text-sm font-medium">{formatDate(item.updated_at)}</p>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t bg-muted/30 flex gap-2">
        <Button variant="outline" className="flex-1">
          Edit
        </Button>
        <Button className="flex-1">
          Advance State
        </Button>
      </div>
    </Card>
  );
}
