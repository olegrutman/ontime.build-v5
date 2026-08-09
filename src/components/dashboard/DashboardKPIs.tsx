import { KPICard } from '@/components/ui/kpi-card';

interface DashboardKPIsProps {
  financials: {
    totalRevenue: number;
    totalCosts: number;
    paidByYou: number;
    paidToYou: number;
    receivedToDate?: number;
    potentialProfit: number;
    profitMargin: number;
    totalBilled: number;
    earnedToDate: number;
    incurredToDate: number;
    marginToDate: number;
    marginToDatePct: number;
    pendingInvoiced?: number;
    cashPosition?: number;
  };
  orgType: string | null;
}

const pct = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : '0%';

export function DashboardKPIs({ financials, orgType }: DashboardKPIsProps) {
  const margin = financials.profitMargin;
  // Revenue-side cash: owner ledger for GCs, paid invoices for everyone else.
  const received = financials.receivedToDate ?? financials.paidToYou;
  const cashPosition = financials.cashPosition ?? received - financials.paidByYou;
  const cashLabel = cashPosition >= 0 ? 'positive' : 'negative';
  // Billed but not yet collected.
  const pending = financials.pendingInvoiced ?? Math.max(0, financials.totalBilled - received);

  if (orgType === 'GC') {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <KPICard label="Contract Value" value={financials.totalRevenue} subtitle="Total portfolio value" delay={0} />
        <KPICard label="Paid Out" value={financials.paidByYou} subtitle="Outgoing payments" delay={40} suffix={pct(financials.paidByYou, financials.totalRevenue)} />
        <KPICard label="Received" value={received} subtitle="Collected from owners" delay={80} suffix={pct(received, financials.totalRevenue)} />
        <KPICard label="Projected Margin" value={financials.potentialProfit} subtitle="Revenue minus costs" delay={120} suffix={`${Math.round(margin)}%`} />
        <KPICard label="Cash Position" value={Math.abs(cashPosition)} subtitle={`Received minus paid · ${cashLabel}`} delay={160} />
      </div>
    );
  }

  if (orgType === 'TC') {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
        <KPICard label="Contract In" value={financials.totalRevenue} subtitle="Revenue from General Contractor contracts" delay={0} />
        <KPICard label="Cost Out" value={financials.totalCosts} subtitle="Labor + materials + subs" delay={40} />
        <KPICard label="Projected Margin" value={financials.potentialProfit} subtitle={margin > 0 ? `+${Math.round(margin)}% margin` : 'Net after costs'} delay={80} suffix={`${Math.round(margin)}%`} />
        <KPICard label="Billed" value={financials.totalBilled} subtitle="Invoiced to date" delay={120} suffix={pct(financials.totalBilled, financials.totalRevenue)} />
        <KPICard label="Cash Position" value={Math.abs(cashPosition)} subtitle={`Received minus paid · ${cashLabel}`} delay={160} />
      </div>
    );
  }

  // FC
  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
      <KPICard label="Contract Value" value={financials.totalRevenue} subtitle="From Trade Contractor / General Contractor contracts" delay={0} />
      <KPICard label="Collected" value={received} subtitle="Payments received" delay={40} />
      <KPICard label="Outstanding" value={Math.max(0, financials.totalRevenue - received)} subtitle="Remaining to collect" delay={80} />
      <KPICard label="Pending" value={pending} subtitle="Billed but not yet received" delay={120} />
      <KPICard label="Cash Position" value={Math.abs(cashPosition)} subtitle={`Received minus paid · ${cashLabel}`} delay={160} />
    </div>
  );
}
