import { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Send, DollarSign, CheckCircle, Truck, ChevronDown, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { PurchaseOrder } from '@/types/purchaseOrder';

interface POActivityTimelineProps {
  po: PurchaseOrder;
}

interface TimelineStep {
  label: string;
  timestamp: string | null | undefined;
  userId?: string | null;
  icon: React.ReactNode;
}

export function POActivityTimeline({ po }: POActivityTimelineProps) {
  const [open, setOpen] = useState(false);

  const steps: TimelineStep[] = [
    { label: 'Created', timestamp: po.created_at, icon: <Plus className="h-3.5 w-3.5" /> },
    { label: 'Submitted to Supplier', timestamp: po.submitted_at, userId: po.submitted_by, icon: <Send className="h-3.5 w-3.5" /> },
    { label: 'Priced by Supplier', timestamp: po.priced_at, userId: po.priced_by, icon: <DollarSign className="h-3.5 w-3.5" /> },
    { label: 'Ordered', timestamp: po.ordered_at, icon: <CheckCircle className="h-3.5 w-3.5" /> },
    { label: 'Delivered', timestamp: po.delivered_at, icon: <Truck className="h-3.5 w-3.5" /> },
  ];

  // Find the last completed step index
  const lastCompletedIndex = steps.reduce((acc, step, i) => (step.timestamp ? i : acc), -1);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full p-4 text-left hover:bg-muted/50 transition-colors rounded-2xl">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Activity Timeline</span>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', open && 'rotate-180')} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="relative ml-2">
              {steps.map((step, index) => {
                const isCompleted = !!step.timestamp;
                const isCurrent = index === lastCompletedIndex;
                const isFuture = !isCompleted;

                return (
                  <div key={step.label} className="relative flex items-start gap-3 pb-5 last:pb-0">
                    {/* Vertical line */}
                    {index < steps.length - 1 && (
                      <div
                        className={cn(
                          'absolute left-[11px] top-6 w-0.5 h-[calc(100%-12px)]',
                          isCompleted && index < lastCompletedIndex ? 'bg-green-500' : 'bg-border'
                        )}
                      />
                    )}
                    {/* Node */}
                    <div
                      className={cn(
                        'relative z-10 flex items-center justify-center w-6 h-6 rounded-full border-2 shrink-0',
                        isCompleted && 'bg-green-500 border-green-500 text-white',
                        isFuture && 'bg-muted border-border text-muted-foreground'
                      )}
                    >
                      {step.icon}
                    </div>
                    {/* Content */}
                    <div className="min-w-0 pt-0.5">
                      <p className={cn('text-sm font-medium', isFuture && 'text-muted-foreground')}>
                        {step.label}
                      </p>
                      {isCompleted ? (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(step.timestamp!), 'MMM d, yyyy · h:mm a')}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground/60">Pending</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
