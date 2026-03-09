import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import type { ScheduleItem } from '@/hooks/useProjectSchedule';

interface WorkPerformedCardProps {
  scheduleItems: ScheduleItem[];
  onProgressChange: (itemId: string, progress: number) => void;
  disabled?: boolean;
}

const STATUS_CHIPS = ['On Track', 'Delayed', 'Blocked', 'Complete'] as const;

export function WorkPerformedCard({ scheduleItems, onProgressChange, disabled }: WorkPerformedCardProps) {
  if (scheduleItems.length === 0) {
    return (
      <div className="bg-card rounded-2xl border p-4 space-y-2">
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Work Performed</h3>
        <p className="text-xs text-muted-foreground text-center py-3">No schedule tasks to update</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border p-4 space-y-3">
      <h3 className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Work Performed</h3>
      <div className="space-y-4">
        {scheduleItems.map(item => (
          <div key={item.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm truncate flex-1 pr-2">{item.title}</span>
              <span className="text-xs font-semibold text-primary">{item.progress}%</span>
            </div>
            <Slider
              value={[item.progress]}
              min={0}
              max={100}
              step={5}
              disabled={disabled}
              onValueChange={([val]) => onProgressChange(item.id, val)}
              className="w-full"
            />
            {item.sov_item && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>Billed: {item.sov_item.billing_progress}%</span>
                <span>·</span>
                <span>${item.sov_item.total_billed_amount.toLocaleString()} / ${item.sov_item.value_amount.toLocaleString()}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
