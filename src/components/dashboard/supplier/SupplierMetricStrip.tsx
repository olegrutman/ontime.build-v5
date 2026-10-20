import { Activity } from 'lucide-react';
import { C, KpiCard } from '@/components/shared/KpiCard';

interface Metric {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'warning' | 'danger';
  hint?: string;
}

const TONE: Record<NonNullable<Metric['tone']>, string> = {
  default: C.ink,
  good: C.green,
  warning: C.amberD,
  danger: C.red,
};

interface Props {
  activeProjects: number;
  overBudgetCount: number;
  upcomingDeliveries: number;
  avgDaysSincePayment: number | null;
}

export function SupplierMetricStrip({
  activeProjects,
  overBudgetCount,
  upcomingDeliveries,
  avgDaysSincePayment,
}: Props) {
  const metrics: Metric[] = [
    { label: 'Active projects', value: String(activeProjects) },
    {
      label: 'Over budget',
      value: String(overBudgetCount),
      tone: overBudgetCount > 0 ? 'danger' : 'good',
      hint: overBudgetCount > 0 ? 'needs attention' : 'all on track',
    },
    {
      label: 'Upcoming deliveries',
      value: String(upcomingDeliveries),
      tone: upcomingDeliveries > 0 ? 'warning' : 'default',
    },
    {
      label: 'Avg days since payment',
      value: avgDaysSincePayment === null ? '—' : `${avgDaysSincePayment}d`,
      tone:
        avgDaysSincePayment === null
          ? 'default'
          : avgDaysSincePayment > 30
          ? 'danger'
          : avgDaysSincePayment > 14
          ? 'warning'
          : 'good',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
      {metrics.map((m, idx) => <KpiCard key={m.label} label={m.label} value={m.value}
        sub={m.hint ?? m.label} icon={<Activity size={18} />} idx={idx}
        accent={TONE[m.tone ?? 'default']} iconBg={C.surface2}
        pills={m.hint ? [{ type: m.tone === 'danger' ? 'pr' : m.tone === 'good' ? 'pg' : 'pm', text: m.hint }] : []} />)}
    </div>
  );
}
