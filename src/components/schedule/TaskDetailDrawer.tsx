import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScheduleItem } from '@/hooks/useProjectSchedule';
import { differenceInDays, addDays, format } from 'date-fns';

interface TaskDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ScheduleItem | null;
  items: ScheduleItem[];
  onUpdate: (id: string, updates: Partial<ScheduleItem>) => void;
  onDateChange?: (id: string, newStart: string, newEnd: string) => void;
  readOnly?: boolean;
}

export function TaskDetailDrawer({ open, onOpenChange, item, items, onUpdate, onDateChange, readOnly }: TaskDetailDrawerProps) {
  const [localProgress, setLocalProgress] = useState(0);

  useEffect(() => {
    if (item) setLocalProgress(item.progress);
  }, [item?.id, item?.progress]);

  if (!item) return null;

  const duration = item.end_date
    ? differenceInDays(new Date(item.end_date), new Date(item.start_date)) + 1
    : 1;

  const deps = items.filter(i => item.dependency_ids.includes(i.id));
  const isAutoMode = !!item.sov_item_id;

  const handleStartDateChange = (newStart: string) => {
    if (!newStart) return;
    const dur = item.end_date
      ? differenceInDays(new Date(item.end_date), new Date(item.start_date))
      : 0;
    const newEnd = format(addDays(new Date(newStart), dur), 'yyyy-MM-dd');
    if (onDateChange) {
      onDateChange(item.id, newStart, newEnd);
    } else {
      onUpdate(item.id, { start_date: newStart, end_date: newEnd });
    }
  };

  const handleEndDateChange = (newEnd: string) => {
    if (!newEnd) return;
    if (onDateChange) {
      onDateChange(item.id, item.start_date, newEnd);
    } else {
      onUpdate(item.id, { end_date: newEnd });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{item.title}</SheetTitle>
          <SheetDescription className="sr-only">Task details and settings</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Type badge */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{item.item_type}</Badge>
            {item.sov_item && (
              <Badge variant="outline" className="text-xs">SOV Linked</Badge>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start Date</Label>
              <Input
                type="date"
                value={item.start_date}
                onChange={e => handleStartDateChange(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End Date</Label>
              <Input
                type="date"
                value={item.end_date || ''}
                onChange={e => handleEndDateChange(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium">Duration</span>
            <span className="text-sm font-semibold">{duration} day{duration !== 1 ? 's' : ''}</span>
          </div>

          {/* Duration mode */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Auto-duration</Label>
              <p className="text-xs text-muted-foreground">Use estimated duration from SOV item</p>
            </div>
            <Switch checked={isAutoMode} disabled />
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Progress</Label>
              <span className="text-sm font-medium">{localProgress}%</span>
            </div>
            <Slider
              value={[localProgress]}
              onValueChange={v => setLocalProgress(v[0])}
              onValueCommit={v => onUpdate(item.id, { progress: v[0] })}
              max={100}
              step={5}
            />
          </div>

          {/* SOV billing info */}
          {item.sov_item && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <p className="text-xs font-medium text-muted-foreground">SOV Item</p>
              <p className="text-sm font-medium">{item.sov_item.item_name}</p>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Value: ${item.sov_item.value_amount.toLocaleString()}</span>
                <span>Billed: {item.sov_item.billing_progress}%</span>
              </div>
            </div>
          )}

          {/* Dependencies */}
          {deps.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Dependencies ({deps.length})</Label>
              <div className="space-y-1">
                {deps.map(dep => (
                  <div key={dep.id} className="text-xs p-2 bg-muted/30 rounded flex items-center justify-between">
                    <span>{dep.title}</span>
                    <span className="text-muted-foreground">
                      {dep.end_date ? dep.end_date : dep.start_date}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
