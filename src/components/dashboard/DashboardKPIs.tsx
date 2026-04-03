import { formatCurrency } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';

interface KPIProps {
  label: string;
  value: number;
  subtitle: string;
  accentColor: 'emerald' | 'amber' | 'blue' | 'red' | 'primary';
  delay?: number;
  prefix?: string;
  suffix?: string;
  isText?: boolean;
  textValue?: string;
}

function KPICard({ label, value, subtitle, accentColor, delay = 0, suffix, isText, textValue }: KPIProps) {
  const animated = useCountUp(value, 900, delay);

  return (
    <div className="rounded-3xl bg-card border border-border/60 shadow-sm p-5 relative overflow-hidden">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-heading text-3xl font-semibold tracking-tight text-foreground leading-none" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {isText ? textValue : formatCurrency(animated)}
        </span>
        {suffix && <span className="text-xs font-semibold text-muted-foreground">{suffix}</span>}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Contract Value" value={financials.totalRevenue} subtitle="Total portfolio value" accentColor="primary" delay={0} />
        <KPICard label="Paid Out" value={financials.paidByYou} subtitle="Outgoing payments" accentColor="amber" delay={40} suffix={financials.totalRevenue > 0 ? `${Math.round((financials.paidByYou / financials.totalRevenue) * 100)}%` : '0%'} />
        <KPICard label="Received" value={financials.paidToYou} subtitle="Incoming payments" accentColor="emerald" delay={80} suffix={financials.totalRevenue > 0 ? `${Math.round((financials.paidToYou / financials.totalRevenue) * 100)}%` : '0%'} />
        <KPICard label="Projected Margin" value={financials.potentialProfit} subtitle="Revenue minus costs" accentColor={marginColor} delay={120} suffix={`${Math.round(margin)}%`} />
      </div>
    );
  }

  if (orgType === 'TC') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Contract In" value={financials.totalRevenue} subtitle="Revenue from GC contracts" accentColor="primary" delay={0} />
        <KPICard label="Cost Out" value={financials.totalCosts} subtitle="labor + materials + subs" accentColor="amber" delay={40} />
        <KPICard label="Projected Margin" value={financials.potentialProfit} subtitle={margin > 0 ? `+${Math.round(margin)}% margin` : 'Net after costs'} accentColor={marginColor} delay={80} suffix={`${Math.round(margin)}%`} />
        <KPICard label="Collected" value={financials.paidToYou} subtitle="Payments received" accentColor="emerald" delay={120} />
      </div>
    );
  }

  // FC
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <KPICard label="Contract Value" value={financials.totalRevenue} subtitle="From TC/GC contracts" accentColor="primary" delay={0} />
      <KPICard label="Collected" value={financials.paidToYou} subtitle="Payments received" accentColor="emerald" delay={40} />
      <KPICard label="Outstanding" value={financials.totalRevenue - financials.paidToYou} subtitle="Remaining to collect" accentColor="amber" delay={80} />
    </div>
  );
}
