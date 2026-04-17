import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ScheduleDeliveryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poNumber: string;
  initialDate?: string | null;
  saving?: boolean;
  onConfirm: (date: Date) => Promise<void> | void;
}

export function ScheduleDeliveryDialog({
  open,
  onOpenChange,
  poNumber,
  initialDate,
  saving,
  onConfirm,
}: ScheduleDeliveryDialogProps) {
  const [date, setDate] = useState<Date | undefined>(
    initialDate ? new Date(initialDate) : undefined
  );

  useEffect(() => {
    if (open) {
      setDate(initialDate ? new Date(initialDate) : undefined);
    }
  }, [open, initialDate]);

  const handleConfirm = async () => {
    if (!date) return;
    await onConfirm(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule Delivery</DialogTitle>
          <DialogDescription>
            Set the expected delivery date for {poNumber}. The buyer will see this
            on their dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full h-11 justify-start text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {date ? format(date, 'PPP') : 'Pick a delivery date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!date || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {initialDate ? 'Update Date' : 'Schedule Delivery'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
