import { ScheduleItem } from '@/hooks/useProjectSchedule';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Minus, Plus, AlertTriangle } from 'lucide-react';
import { differenceInDays, addDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  item: ScheduleItem;
  projectStart: Date;
  projectEnd: Date;
  isConflict: boolean;
  onAdjustDuration: (id: string, delta: number) => void;
  onChangeStartDate: (id: string, date: string) => void;
}

const STATUS_PILL: Record<string, { label: string; className: string }> = {
  not_started: { label: 'Not Started', className: 'bg-muted text-muted-foreground' },
  in_progress: { label: 'In Progress', className: 'bg-primary/15 text-primary' },
  complete: { label: 'Complete', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

const TYPE_COLORS: Record<string, string> = {
  phase: 'border-l-primary',
  task: 'border-l-green-500',
  milestone: 'border-l-amber-500',
};

export function TaskCard({ item, projectStart, projectEnd, isConflict, onAdjustDuration, onChangeStartDate }: TaskCardProps) {
  const status = item.progress === 0 ? 'not_started' : item.progress >= 100 ? 'complete' : 'in_progress';
  const pill = STATUS_PILL[status];

  const duration = item.end_date
    ? differenceInDays(new Date(item.end_date), new Date(item.start_date)) + 1
    : 1;

  // Mini timeline proportional bar
  const totalSpan = Math.max(differenceInDays(projectEnd, projectStart), 1);
  const barStart = Math.max(0, differenceInDays(new Date(item.start_date), projectStart) / totalSpan * 100);
  const barWidth = Math.max(2, (duration / totalSpan) * 100);

  return (
    <div className={cn(
      'border rounded-lg p-3 space-y-2.5 border-l-4 bg-card',
      TYPE_COLORS[item.item_type] || TYPE_COLORS.task,
      isConflict && 'ring-2 ring-destructive/50'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground capitalize">{item.item_type}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {isConflict && <AlertTriangle className="h-4 w-4 text-destructive" />}
          <Badge variant="secondary" className={cn('text-[10px] px-1.5 py-0.5', pill.className)}>
            {pill.label}
          </Badge>
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{format(new Date(item.start_date), 'MMM d')}</span>
        <span>→</span>
        <span>{item.end_date ? format(new Date(item.end_date), 'MMM d') : '—'}</span>
        <span className="ml-auto font-medium text-foreground">{duration}d</span>
      </div>

      {/* Mini timeline */}
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="absolute h-full rounded-full bg-primary/60"
          style={{ left: `${barStart}%`, width: `${Math.min(barWidth, 100 - barStart)}%` }}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 gap-1 text-xs"
          onClick={() => onAdjustDuration(item.id, -1)}
          disabled={duration <= 1}
        >
          <Minus className="h-3.5 w-3.5" /> 1 day
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 flex-1 gap-1 text-xs"
          onClick={() => onAdjustDuration(item.id, 1)}
        >
          <Plus className="h-3.5 w-3.5" /> 1 day
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 shrink-0">
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={new Date(item.start_date)}
              onSelect={d => d && onChangeStartDate(item.id, format(d, 'yyyy-MM-dd'))}
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
