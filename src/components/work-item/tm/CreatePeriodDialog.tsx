import { useState, useMemo } from 'react';
import { format, endOfWeek, startOfDay, isWithinInterval, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TMPeriodType, TMPeriod } from './types';

interface CreatePeriodDialogProps {
  workItemId: string;
  existingPeriods?: TMPeriod[];
  onCreated: () => void;
}

export function CreatePeriodDialog({ workItemId, existingPeriods = [], onCreated }: CreatePeriodDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [periodType, setPeriodType] = useState<TMPeriodType>('WEEKLY');
  const [startDate, setStartDate] = useState<Date | undefined>(startOfDay(new Date()));

  const getEndDate = (start: Date, type: TMPeriodType): Date => {
    if (type === 'DAILY') {
      return start;
    }
    // Weekly: end of the week from start date
    return endOfWeek(start, { weekStartsOn: 1 }); // Monday start
  };

  // Check for date overlap with existing periods
  const overlapWarning = useMemo(() => {
    if (!startDate) return null;
    
    const newStart = startDate;
    const newEnd = getEndDate(startDate, periodType);

    for (const period of existingPeriods) {
      const existingStart = parseISO(period.period_start);
      const existingEnd = parseISO(period.period_end);

      // Check if new period overlaps with existing
      const overlaps = 
        isWithinInterval(newStart, { start: existingStart, end: existingEnd }) ||
        isWithinInterval(newEnd, { start: existingStart, end: existingEnd }) ||
        isWithinInterval(existingStart, { start: newStart, end: newEnd }) ||
        isWithinInterval(existingEnd, { start: newStart, end: newEnd });

      if (overlaps) {
        return `Overlaps with existing ${period.period_type.toLowerCase()} period (${format(existingStart, 'MMM d')} - ${format(existingEnd, 'MMM d')})`;
      }
    }

    return null;
  }, [startDate, periodType, existingPeriods]);

  const handleCreate = async () => {
    if (!startDate) {
      toast.error('Please select a start date');
      return;
    }

    if (overlapWarning) {
      toast.error('Cannot create overlapping periods');
      return;
    }

    setLoading(true);
    const endDate = getEndDate(startDate, periodType);

    const { error } = await supabase
      .from('tm_periods')
      .insert({
        work_item_id: workItemId,
        period_start: format(startDate, 'yyyy-MM-dd'),
        period_end: format(endDate, 'yyyy-MM-dd'),
        period_type: periodType,
        status: 'OPEN',
      });

    if (error) {
      toast.error(`Failed to create period: ${error.message}`);
    } else {
      toast.success(`${periodType.toLowerCase()} period created`);
      setOpen(false);
      onCreated();
    }

    setLoading(false);
  };

  const displayEndDate = startDate ? getEndDate(startDate, periodType) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          New Period
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create T&M Period</DialogTitle>
          <DialogDescription>
            Create a new billing period for time and materials tracking.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Period Type</Label>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as TMPeriodType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {displayEndDate && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Period End</p>
              <p className="font-medium">{format(displayEndDate, 'PPP')}</p>
            </div>
          )}

          {overlapWarning && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{overlapWarning}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !startDate || !!overlapWarning}>
            Create Period
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
