import { ChartNoAxesCombined } from 'lucide-react';
import { C, KpiCard } from '@/components/shared/KpiCard';
import { formatCurrency } from '@/lib/utils';
import type { SupplierKPIs } from '@/hooks/useSupplierDashboardData';

interface KPICardProps {
  label: string;
  value: number;
  tag: string;
  tagColor: 'green' | 'red' | 'amber' | 'neutral';
  subText: string;
  delay: number;
}

function KPICard({ label, value, tag, tagColor, subText, delay }: KPICardProps) {
  const accent = tagColor === 'red' ? C.red : tagColor === 'amber' ? C.amber : tagColor === 'green' ? C.green : C.blue;
  return <KpiCard label={label} value={formatCurrency(value)} sub={subText} idx={delay / 40}
    accent={accent} iconBg={`color-mix(in srgb, ${accent} 10%, transparent)`} icon={<ChartNoAxesCombined size={18} />}
    pills={tag ? [{ type: tagColor === 'red' ? 'pr' : tagColor === 'amber' ? 'pa' : tagColor === 'green' ? 'pg' : 'pm', text: tag }] : []} />;
}

interface Props { kpis: SupplierKPIs; }

export function SupplierKPIStrip({ kpis }: Props) {
  // MoM% trend — only meaningful when previous month has data
  const hasPriorData = kpis.paidLastMonth > 0;
  const momTrend = hasPriorData
    ? Math.round(((kpis.paidThisMonth - kpis.paidLastMonth) / kpis.paidLastMonth) * 100)
    : 0;
  const momTag = !hasPriorData
    ? (kpis.paidThisMonth > 0 ? 'New' : '—')
    : momTrend > 0 ? `↑ ${momTrend}%` : momTrend < 0 ? `↓ ${Math.abs(momTrend)}%` : 'Flat';
  const momColor = !hasPriorData
    ? (kpis.paidThisMonth > 0 ? 'green' : 'neutral')
    : momTrend > 0 ? 'green' : momTrend < 0 ? 'red' : 'neutral';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <KPICard
        label="Total Receivable"
        value={kpis.totalReceivable}
        tag={kpis.overdueCount > 0 ? `${kpis.overdueCount} overdue` : 'Current'}
        tagColor={kpis.overdueCount > 0 ? 'red' : 'green'}
        subText="Outstanding invoices"
        delay={0}
      />
      <KPICard
        label="Paid This Month"
        value={kpis.paidThisMonth}
        tag={momTag}
        tagColor={momColor as any}
        subText="vs last month"
        delay={40}
      />
      <KPICard
        label="Open Orders"
        value={kpis.openOrdersCount}
        tag={kpis.needsConfirmationCount > 0 ? `${kpis.needsConfirmationCount} to confirm` : 'All confirmed'}
        tagColor={kpis.needsConfirmationCount > 0 ? 'amber' : 'green'}
        subText="Active purchase orders"
        delay={80}
      />
      <KPICard
        label="Credit Exposure"
        value={kpis.creditExposure}
        tag={kpis.creditExposure > 0 ? 'At risk' : 'Clear'}
        tagColor={kpis.creditExposure > 0 ? 'red' : 'green'}
        subText="Delivered, not yet approved"
        delay={120}
      />
    </div>
  );
}
