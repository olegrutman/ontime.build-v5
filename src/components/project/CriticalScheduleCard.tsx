import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Clock, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useProjectSchedule } from '@/hooks/useProjectSchedule';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';

interface CriticalScheduleCardProps {
  projectId: string;
  onNavigate: (tab: string) => void;
  maxItems?: number;
}

export function CriticalScheduleCard({ projectId, onNavigate, maxItems = 5 }: CriticalScheduleCardProps) {
  const { items } = useProjectSchedule(projectId);
  const today = useMemo(() => new Date(), []);

  const criticalItems = useMemo(() => {
    if (!items?.length) return [];
    return items
      .filter(item => {
        if (item.progress >= 100 || !item.end_date) return false;
        const end = parseISO(item.end_date);
        const daysUntil = differenceInCalendarDays(end, today);
        return daysUntil < 7; // overdue (negative) or due within 7 days
      })
      .sort((a, b) => {
        const aEnd = parseISO(a.end_date!);
        const bEnd = parseISO(b.end_date!);
        return aEnd.getTime() - bEnd.getTime(); // most urgent first
      })
      .slice(0, maxItems);
  }, [items, today, maxItems]);

  if (!criticalItems.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3.5 py-3.5">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium">Critical Schedule</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span>No critical items — all on track</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => onNavigate('schedule')}
        className="flex items-center justify-between w-full p-4 pb-2 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-[0.7rem] uppercase tracking-[0.4px] text-muted-foreground font-medium">Critical Schedule</span>
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
            {criticalItems.length}
          </Badge>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>

      <div className="px-4 pb-3 space-y-2">
        {criticalItems.map(item => {
          const endDate = parseISO(item.end_date!);
          const daysUntil = differenceInCalendarDays(endDate, today);
          const isOverdue = daysUntil < 0;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate('schedule')}
              className="w-full text-left rounded-lg bg-muted/50 p-3 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium truncate pr-2">{item.title}</span>
                {isOverdue ? (
                  <Badge className="bg-destructive/10 text-destructive border-0 text-[10px] shrink-0">
                    OVERDUE
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-0 text-[10px] shrink-0">
                    {daysUntil === 0 ? 'TODAY' : `${daysUntil}d`}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Progress value={item.progress} className="h-1.5 flex-1" />
                <span className="text-[10px] text-muted-foreground w-8 text-right">{item.progress}%</span>
              </div>
              <span className="text-[10px] text-muted-foreground mt-1 block">
                Due {format(endDate, 'MMM d')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
