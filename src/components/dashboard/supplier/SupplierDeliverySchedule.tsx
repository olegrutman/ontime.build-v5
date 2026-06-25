import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import type { DeliveryDay, DeliveryRow } from '@/hooks/useSupplierDashboardData';

interface Props {
  days: DeliveryDay[];
  rows: DeliveryRow[];
}

export function SupplierDeliverySchedule({ days, rows }: Props) {
  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-heading text-[0.82rem] font-bold text-foreground uppercase tracking-wide">
          Delivery Schedule
        </h3>
        <p className="text-[0.68rem] text-muted-foreground mt-0.5">This week</p>
      </div>

      {/* 5-day strip */}
      <div className="grid grid-cols-5 gap-1 px-3 py-3">
        {days.map(day => (
          <div
            key={day.date.toISOString()}
            className={`text-center rounded-md py-2 px-1 ${
              day.hasDeliveries
                ? 'bg-primary/10 border border-primary/30'
                : 'bg-accent border border-transparent'
            }`}
          >
            <div className="text-[0.65rem] uppercase text-muted-foreground font-medium">
              {format(day.date, 'EEE')}
            </div>
            <div className="text-[0.9rem] font-bold text-foreground">{format(day.date, 'd')}</div>
            {day.hasDeliveries && (
              <div className="text-[0.6rem] font-semibold text-primary mt-0.5">
                {day.count} drop{day.count > 1 ? 's' : ''}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delivery rows */}
      <div className="px-3 pb-3 space-y-1.5">
        {rows.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-[0.78rem] text-muted-foreground">No deliveries scheduled this week</p>
          </div>
        ) : (
          rows.slice(0, 5).map(row => (
            <div
              key={row.id}
              className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                row.confirmed
                  ? 'border-border bg-accent/50'
                  : 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[0.78rem] font-semibold text-foreground truncate">
                  {row.poNumber} · {row.projectName}
                </div>
                <div className="text-[0.68rem] text-muted-foreground">
                  {format(new Date(row.deliveryDate), 'EEE, MMM d')}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {row.poTotal != null && (
                  <span className="text-[0.72rem] font-semibold text-foreground">
                    {formatCurrency(row.poTotal)}
                  </span>
                )}
                <span className={`w-2 h-2 rounded-full ${row.confirmed ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
