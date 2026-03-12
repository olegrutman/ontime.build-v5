import { useMemo } from 'react';
import { ScheduleItem } from '@/hooks/useProjectSchedule';
import { PhaseCardGroup } from './PhaseCardGroup';
import { TaskCard } from './TaskCard';
import { differenceInDays } from 'date-fns';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';

interface MobileScheduleViewProps {
  items: ScheduleItem[];
  conflicts: Set<string>;
  onAdjustDuration: (id: string, delta: number) => void;
  onChangeStartDate: (id: string, date: string) => void;
  readOnly?: boolean;
}

export function MobileScheduleView({ items, conflicts, onAdjustDuration, onChangeStartDate, readOnly }: MobileScheduleViewProps) {
  const { projectStart, projectEnd, daysRemaining, phases } = useMemo(() => {
    if (!items.length) {
      const today = new Date();
      return {
        projectStart: today,
        projectEnd: today,
        daysRemaining: 0,
        phases: new Map<string, ScheduleItem[]>(),
      };
    }

    const allDates = items.flatMap(i => {
      const d = [new Date(i.start_date)];
      if (i.end_date) d.push(new Date(i.end_date));
      return d;
    });
    const ps = new Date(Math.min(...allDates.map(d => d.getTime())));
    const pe = new Date(Math.max(...allDates.map(d => d.getTime())));
    const today = new Date();
    const remaining = Math.max(0, differenceInDays(pe, today));

    // Group by item_type: phases get their own group, tasks go under "Tasks"
    const grouped = new Map<string, ScheduleItem[]>();
    const phaseItems = items.filter(i => i.item_type === 'phase');
    const taskItems = items.filter(i => i.item_type !== 'phase');

    for (const phase of phaseItems) {
      grouped.set(phase.title, [phase]);
    }

    if (taskItems.length > 0) {
      grouped.set('Tasks', taskItems);
    }

    return { projectStart: ps, projectEnd: pe, daysRemaining: remaining, phases: grouped };
  }, [items]);

  return (
    <div className="space-y-3">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border rounded-lg p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <div>
            <span className="font-medium">{format(projectStart, 'MMM d')}</span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className="font-medium">{format(projectEnd, 'MMM d, yyyy')}</span>
          </div>
        </div>
        <div className="text-xs font-semibold text-primary">
          {daysRemaining}d left
        </div>
      </div>

      {/* Phase groups */}
      {Array.from(phases.entries()).map(([phaseName, phaseItems]) => {
        const totalDays = phaseItems.reduce((sum, i) => {
          if (!i.end_date) return sum + 1;
          return sum + differenceInDays(new Date(i.end_date), new Date(i.start_date)) + 1;
        }, 0);

        return (
          <PhaseCardGroup key={phaseName} phaseName={phaseName} totalDays={totalDays}>
            {phaseItems.map(item => (
              <TaskCard
                key={item.id}
                item={item}
                projectStart={projectStart}
                projectEnd={projectEnd}
                isConflict={conflicts.has(item.id)}
                onAdjustDuration={readOnly ? undefined : onAdjustDuration}
                onChangeStartDate={readOnly ? undefined : onChangeStartDate}
              />
            ))}
          </PhaseCardGroup>
        );
      })}

      {items.length === 0 && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No schedule items yet.
        </div>
      )}
    </div>
  );
}
