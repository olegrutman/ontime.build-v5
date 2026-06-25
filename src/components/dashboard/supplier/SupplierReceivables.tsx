import { formatCurrency } from '@/lib/utils';
import type { AgingBucket, VelocityPoint } from '@/hooks/useSupplierDashboardData';

const bucketColors = ['bg-emerald-500', 'bg-amber-500', 'bg-red-500'];
const bucketTextColors = ['text-emerald-700 dark:text-emerald-300', 'text-amber-700 dark:text-amber-300', 'text-red-700 dark:text-red-300'];

interface Props {
  buckets: AgingBucket[];
  velocity: VelocityPoint[];
  oldestDays: number | null;
}

export function SupplierReceivables({ buckets, velocity, oldestDays }: Props) {
  const totalOutstanding = buckets.reduce((s, b) => s + b.amount, 0);
  const maxVelocity = Math.max(...velocity.map(v => v.avgDays), 1);

  return (
    <div className="bg-card border border-border rounded-lg">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-heading text-[0.82rem] font-bold text-foreground uppercase tracking-wide">
          Receivables
        </h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="font-heading text-[1.5rem] font-black text-foreground leading-none">
            {formatCurrency(totalOutstanding)}
          </span>
          <span className="text-[0.68rem] text-muted-foreground">outstanding</span>
        </div>
      </div>

      {/* Aging buckets */}
      <div className="px-4 py-3 space-y-3">
        {buckets.map((bucket, i) => (
          <div key={bucket.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[0.72rem] font-medium text-foreground">{bucket.label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-[0.68rem] font-semibold ${bucketTextColors[i]}`}>
                  {bucket.count} inv
                </span>
                <span className="text-[0.72rem] font-bold text-foreground">
                  {formatCurrency(bucket.amount)}
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-accent rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${bucketColors[i]}`}
                style={{ width: `${bucket.percent}%` }}
              />
            </div>
            <div className="text-[0.62rem] text-muted-foreground mt-0.5">{bucket.range}</div>
          </div>
        ))}

        {oldestDays != null && oldestDays > 30 && (
          <div className="text-[0.7rem] text-red-600 dark:text-red-400 font-medium mt-1">
            ⚠ Oldest invoice: {oldestDays} days
          </div>
        )}
      </div>

      {/* Approval velocity */}
      <div className="px-4 pb-4">
        <div className="text-[0.68rem] uppercase tracking-wide text-muted-foreground mb-2 font-medium">
          Approval Velocity (avg days)
        </div>
        <div className="flex items-end gap-1 h-12">
          {velocity.map((v, i) => (
            <div key={v.month} className="flex-1 flex flex-col items-center gap-0.5">
              <div
                className={`w-full rounded-t transition-all duration-500 ${
                  i === velocity.length - 1 ? 'bg-primary' : 'bg-muted-foreground/20'
                }`}
                style={{ height: `${maxVelocity > 0 ? Math.max((v.avgDays / maxVelocity) * 100, 4) : 4}%` }}
              />
              <span className="text-[0.55rem] text-muted-foreground">
                {v.month.split('-')[1]}
              </span>
            </div>
          ))}
        </div>
        {velocity.length > 1 && (
          <div className="text-[0.65rem] text-muted-foreground mt-1 text-center">
            {velocity[velocity.length - 1].avgDays > 0 ? `${velocity[velocity.length - 1].avgDays}d avg this month` : 'No data this month'}
          </div>
        )}
      </div>
    </div>
  );
}
