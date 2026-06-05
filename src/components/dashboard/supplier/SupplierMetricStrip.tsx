import { C, fontVal, fontLabel } from '@/components/shared/KpiCard';

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
    <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 10 }}>
      {metrics.map((m) => (
        <div
          key={m.label}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <span
            style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: C.muted,
              ...fontLabel,
            }}
          >
            {m.label}
          </span>
          <span
            style={{
              fontSize: '1.4rem',
              color: TONE[m.tone ?? 'default'],
              ...fontVal,
              lineHeight: 1,
            }}
          >
            {m.value}
          </span>
          {m.hint && (
            <span style={{ fontSize: '0.64rem', color: C.faint, ...fontLabel }}>
              {m.hint}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
