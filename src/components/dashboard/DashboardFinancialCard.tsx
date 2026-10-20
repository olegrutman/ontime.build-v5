import { DollarSign } from 'lucide-react';
import { C, KpiCard } from '@/components/shared/KpiCard';

interface DashboardFinancialCardProps {
  role: 'GC' | 'TC' | 'FC';
  totalContractValue: number;
  outstandingToPay: number;
  outstandingToCollect: number;
  profitMargin?: number;
  totalRevenue?: number;
  totalCosts?: number;
  totalWorkOrders?: number;
  totalWorkOrderValue?: number;
  totalBilled?: number;
  outstandingBilling?: number;
  potentialProfit?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

export function DashboardFinancialCard(props: DashboardFinancialCardProps) {
  const { role, totalContractValue, outstandingToPay, outstandingToCollect, profitMargin, totalRevenue, totalCosts, totalWorkOrders, totalWorkOrderValue, totalBilled, outstandingBilling, potentialProfit } = props;
  const rows = role === 'TC' ? [
    ['Active Contracts', formatCurrency(totalContractValue)],
    [`Change Orders (${totalWorkOrders || 0})`, formatCurrency(totalWorkOrderValue || 0)],
    ['Total Billed', formatCurrency(totalBilled || 0)],
    ['Outstanding Billing', formatCurrency(outstandingBilling || 0)],
    ['Outstanding to Collect', formatCurrency(outstandingToCollect)],
    ['Costs', `-${formatCurrency(totalCosts || 0)}`],
    ['Potential Profit', formatCurrency(potentialProfit || 0)],
    ['Profit Margin', profitMargin !== undefined ? `${profitMargin.toFixed(1)}%` : '--'],
  ] : role === 'GC' ? [['Outstanding to Pay', formatCurrency(outstandingToPay)]] : [
    ['Outstanding to Collect', formatCurrency(outstandingToCollect)], ['Contract Value', formatCurrency(totalContractValue)],
  ];
  return <div data-sasha-card="Financial Summary"><KpiCard label="Financial Snapshot" value={formatCurrency(role === 'TC' ? totalRevenue || 0 : totalContractValue)}
    sub={role === 'TC' ? 'Total Revenue' : 'Total Contracts'} icon={<DollarSign size={18} />} accent={C.green} iconBg={C.greenBg}>
    <div className="divide-y divide-border p-4">{rows.map(([label, value]) => <div key={label} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span className="min-w-0 text-muted-foreground">{label}</span><span className="font-mono font-semibold">{value}</span></div>)}</div>
  </KpiCard></div>;
}
