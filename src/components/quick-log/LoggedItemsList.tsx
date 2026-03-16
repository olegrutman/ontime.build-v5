import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { LogItem } from '@/types/quickLog';

interface LoggedItemsListProps {
  items: LogItem[];
  openCount: number;
  openTotal: number;
  onSubmitAll: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  open: { label: 'Open', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200' },
  submitted_to_tc: { label: 'Sent to TC', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200' },
  submitted_to_gc: { label: 'Sent to GC', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200' },
  approved: { label: 'Approved', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' },
  invoiced: { label: 'Invoiced', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' },
};

export function LoggedItemsList({ items, openCount, openTotal, onSubmitAll }: LoggedItemsListProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold">Open this period</h3>
            {openCount > 0 && (
              <p className="text-xs text-amber-600 font-medium">{openCount} unsubmitted · {fmt(openTotal)}</p>
            )}
          </div>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {items.map((item) => {
            const badge = STATUS_BADGE[item.status] || STATUS_BADGE.open;
            return (
              <div key={item.id} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                <div
                  className="w-1 rounded-full self-stretch shrink-0"
                  style={{ backgroundColor: '#D97706' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[item.location, `${item.qty || item.hours || 0} ${item.unit}`, item.material_spec].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium">{fmt(item.line_total)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {openCount > 0 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground">{items.length} items · {fmt(openTotal)}</span>
            <Button size="sm" variant="default" onClick={onSubmitAll}>
              Submit All Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
