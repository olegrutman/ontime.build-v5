import { useMemo } from 'react';
import { format, startOfMonth, endOfMonth, subMonths, subDays, differenceInCalendarDays } from 'date-fns';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface BillingPeriodPickerProps {
  periodStart: Date | undefined;
  periodEnd: Date | undefined;
  onChange: (start: Date | undefined, end: Date | undefined, confirmed: boolean) => void;
  confirmed: boolean;
  showRequiredWarning?: boolean;
  className?: string;
}

/**
 * Validate a billing period. Returns null if valid, else an error message.
 */
export function validateBillingPeriod(
  periodStart: Date | undefined,
  periodEnd: Date | undefined,
  confirmed: boolean
): string | null {
  if (!confirmed || !periodStart || !periodEnd) {
    return 'Please confirm the billing period for this invoice.';
  }
  const s = periodStart.getTime();
  const e = periodEnd.getTime();
  if (Number.isNaN(s) || Number.isNaN(e)) return 'Enter valid billing period dates.';
  if (e < s) return 'Period end must be on or after period start.';
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  if (e > todayEnd.getTime()) return 'Period end cannot be in the future.';
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  if (s < twoYearsAgo.getTime()) return 'Period start is more than 2 years ago — please confirm the dates.';
  return null;
}

export function BillingPeriodPicker({
  periodStart,
  periodEnd,
  onChange,
  confirmed,
  showRequiredWarning = false,
  className,
}: BillingPeriodPickerProps) {
  const today = useMemo(() => new Date(), []);

  const applyChip = (start: Date, end: Date) => {
    onChange(start, end, true);
  };

  const chips: { label: string; onClick: () => void }[] = [
    {
      label: 'This month to date',
      onClick: () => applyChip(startOfMonth(today), today),
    },
    {
      label: 'Last month',
      onClick: () => {
        const lm = subMonths(today, 1);
        applyChip(startOfMonth(lm), endOfMonth(lm));
      },
    },
    {
      label: 'Last 2 weeks',
      onClick: () => applyChip(subDays(today, 13), today),
    },
  ];

  const daysStale =
    periodEnd && confirmed ? differenceInCalendarDays(today, periodEnd) : 0;
  const isStale = daysStale > 15;

  const notSet = !periodStart || !periodEnd || !confirmed;
  const highlight = notSet && showRequiredWarning;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Quick pick
        </span>
        {chips.map((c) => (
          <Button
            key={c.label}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={c.onClick}
          >
            {c.label}
          </Button>
        ))}
        <span className="ml-auto text-[11px] text-muted-foreground">
          Today: {format(today, 'MMM d, yyyy')}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Period Start</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !periodStart && 'text-muted-foreground',
                  highlight && 'border-destructive text-destructive'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {periodStart ? format(periodStart, 'MMM d, yyyy') : 'Select start date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={periodStart}
                onSelect={(date) => {
                  if (!date) return;
                  const nextEnd = periodEnd && date > periodEnd ? date : periodEnd;
                  onChange(date, nextEnd, Boolean(nextEnd));
                }}
                disabled={(d) => d > today}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Period End</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !periodEnd && 'text-muted-foreground',
                  highlight && 'border-destructive text-destructive'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {periodEnd ? format(periodEnd, 'MMM d, yyyy') : 'Select end date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={periodEnd}
                onSelect={(date) => {
                  if (!date) return;
                  onChange(periodStart, date, Boolean(periodStart));
                }}
                disabled={(d) => d > today || (periodStart ? d < periodStart : false)}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {highlight && (
        <p className="text-xs text-destructive">
          Please confirm the billing period for this invoice before submitting.
        </p>
      )}
      {!highlight && isStale && (
        <p className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          This period ended {daysStale} days ago — is that correct?
        </p>
      )}
    </div>
  );
}
