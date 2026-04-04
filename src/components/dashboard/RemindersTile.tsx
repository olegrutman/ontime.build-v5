import { Bell, Plus } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';

export interface Reminder {
  id: string;
  title: string;
  due_date: string;
  project_id?: string | null;
  project_name?: string | null;
  completed: boolean;
}

interface RemindersTileProps {
  reminders: Reminder[];
  onComplete: (id: string) => void;
  onAdd: () => void;
}

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d');
}

export function RemindersTile({ reminders, onComplete, onAdd }: RemindersTileProps) {
  const upcomingReminders = reminders
    .filter(r => !r.completed)
    .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  return (
    <SurfaceCard data-sasha-card="Reminders">
      <SurfaceCardHeader
        title="Reminders"
        action={
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        }
      />
      <SurfaceCardBody>
        {upcomingReminders.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[0.8rem] text-muted-foreground mb-3">No upcoming reminders</p>
            <Button variant="outline" size="sm" onClick={onAdd} className="h-9 text-[0.8rem]">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Reminder
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {upcomingReminders.map(reminder => {
              const isOverdue = isPast(new Date(reminder.due_date)) && !isToday(new Date(reminder.due_date));
              return (
                <div
                  key={reminder.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={reminder.completed}
                    onCheckedChange={() => onComplete(reminder.id)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.85rem] truncate">{reminder.title}</p>
                    <p className={cn(
                      "text-[0.7rem]",
                      isOverdue ? "text-destructive font-semibold" : "text-muted-foreground"
                    )}>
                      {isOverdue && '⚠ Overdue · '}
                      {formatDueDate(reminder.due_date)}
                      {reminder.project_name && ` · ${reminder.project_name}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
