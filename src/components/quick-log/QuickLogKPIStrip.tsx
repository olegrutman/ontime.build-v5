import { Card } from '@/components/ui/card';

interface QuickLogKPIStripProps {
  openCount: number;
  openTotal: number;
  submittedCount: number;
  submittedTotal: number;
  approvedCount: number;
  approvedTotal: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function QuickLogKPIStrip({ openCount, openTotal, submittedCount, submittedTotal, approvedCount, approvedTotal }: QuickLogKPIStripProps) {
  const cards = [
    { label: 'Open', count: openCount, total: openTotal, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-800' },
    { label: 'With TC/GC', count: submittedCount, total: submittedTotal, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800' },
    { label: 'Approved', count: approvedCount, total: approvedTotal, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <Card key={c.label} className={`p-3 ${c.bg} border ${c.border}`}>
          <p className={`text-2xl font-bold ${c.color}`}>{c.count}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</p>
          {c.total > 0 && <p className={`text-sm font-medium mt-1 ${c.color}`}>{fmt(c.total)}</p>}
        </Card>
      ))}
    </div>
  );
}
