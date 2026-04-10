import { formatCurrency } from '@/lib/utils';
import { KPICard } from '@/components/ui/kpi-card';

interface DashboardKPIsProps {
  financials: {
    totalRevenue: number;
    totalCosts: number;
    paidByYou: number;
    paidToYou: number;
    potentialProfit: number;
    profitMargin: number;
    totalBilled: number;
  };
  orgType: string | null;
}

export function DashboardKPIs({ financials, orgType }: DashboardKPIsProps) {
  const margin = financials.profitMargin;
  const marginColor = margin >= 15 ? 'emerald' : margin >= 5 ? 'amber' : 'red';

  if (orgType === 'GC') {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KPICard label="Contract Value" value={financials.totalRevenue} subtitle="Total portfolio value" delay={0} />
        <KPICard label="Paid Out" value={financials.paidByYou} subtitle="Outgoing payments" delay={40} suffix={financials.totalRevenue > 0 ? `${Math.round((financials.paidByYou / financials.totalRevenue) * 100)}%` : '0%'} />
        <KPICard label="Received" value={financials.paidToYou} subtitle="Incoming payments" delay={80} suffix={financials.totalRevenue > 0 ? `${Math.round((financials.paidToYou / financials.totalRevenue) * 100)}%` : '0%'} />
        <KPICard label="Projected Margin" value={financials.potentialProfit} subtitle="Revenue minus costs" delay={120} suffix={`${Math.round(margin)}%`} />
      </div>
    );
  }

  if (orgType === 'TC') {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <KPICard label="Contract In" value={financials.totalRevenue} subtitle="Revenue from General Contractor contracts" delay={0} />
        <KPICard label="Cost Out" value={financials.totalCosts} subtitle="Labor + materials + subs" delay={40} />
        <KPICard label="Projected Margin" value={financials.potentialProfit} subtitle={margin > 0 ? `+${Math.round(margin)}% margin` : 'Net after costs'} delay={80} suffix={`${Math.round(margin)}%`} />
        <KPICard label="Billed" value={financials.totalBilled} subtitle="Payments received" delay={120} suffix={financials.totalRevenue > 0 ? `${Math.round((financials.totalBilled / financials.totalRevenue) * 100)}%` : '0%'} />
      </div>
    );
  }

  // FC
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <KPICard label="Contract Value" value={financials.totalRevenue} subtitle="From Trade Contractor / General Contractor contracts" delay={0} />
      <KPICard label="Collected" value={financials.paidToYou} subtitle="Payments received" delay={40} />
      <KPICard label="Outstanding" value={financials.totalRevenue - financials.paidToYou} subtitle="Remaining to collect" delay={80} />
    </div>
  );
}
