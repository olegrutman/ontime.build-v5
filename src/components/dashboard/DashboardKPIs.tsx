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
}

const ACCENT = {
  emerald: { bar: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' },
  amber: { bar: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' },
  blue: { bar: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' },
  red: { bar: 'bg-red-500', badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400' },
  primary: { bar: 'bg-primary', badge: 'bg-primary/10 text-primary' },
};

function KPICard({ label, value, subtitle, accentColor, delay = 0, suffix }: KPIProps) {
  const animated = useCountUp(value, 900, delay);
  const accent = ACCENT[accentColor];

  return (
    <div className="rounded-xl bg-card border border-border/60 shadow-sm px-4 py-3.5 relative overflow-hidden transition-all duration-300 hover:-translate-y-px hover:shadow-md">
      <div className={cn('absolute bottom-0 left-0 right-0 h-[2px]', accent.bar)} />
      <p className="text-[0.68rem] uppercase tracking-wide text-muted-foreground font-medium mb-1.5">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-heading text-2xl sm:text-[1.75rem] font-black tracking-tight text-foreground leading-none" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {formatCurrency(animated)}
        </span>
        {suffix && <span className={cn('text-[0.65rem] font-semibold px-1.5 py-0.5 rounded-full', accent.badge)}>{suffix}</span>}
      </div>
      <p className="text-[0.7rem] text-muted-foreground mt-1">{subtitle}</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KPICard label="Contract Value" value={financials.totalRevenue} subtitle="Total portfolio value" accentColor="primary" delay={0} />
        <KPICard label="Paid Out" value={financials.paidByYou} subtitle="Outgoing payments" accentColor="amber" delay={40} suffix={financials.totalRevenue > 0 ? `${Math.round((financials.paidByYou / financials.totalRevenue) * 100)}%` : '0%'} />
        <KPICard label="Received" value={financials.paidToYou} subtitle="Incoming payments" accentColor="emerald" delay={80} suffix={financials.totalRevenue > 0 ? `${Math.round((financials.paidToYou / financials.totalRevenue) * 100)}%` : '0%'} />
        <KPICard label="Projected Margin" value={financials.potentialProfit} subtitle="Revenue minus costs" accentColor={marginColor} delay={120} suffix={`${Math.round(margin)}%`} />
      </div>
    );
  }

  if (orgType === 'TC') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <KPICard label="Contract In" value={financials.totalRevenue} subtitle="Revenue from GC contracts" accentColor="primary" delay={0} />
        <KPICard label="Cost Out" value={financials.totalCosts} subtitle="Subcontract costs" accentColor="amber" delay={40} />
        <KPICard label="Collected" value={financials.paidToYou} subtitle="Payments received" accentColor="emerald" delay={80} />
        <KPICard label="Projected Margin" value={financials.potentialProfit} subtitle="Net after costs" accentColor={marginColor} delay={120} suffix={`${Math.round(margin)}%`} />
      </div>
    );
  }

  // FC
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
      <KPICard label="Contract Value" value={financials.totalRevenue} subtitle="From TC/GC contracts" accentColor="primary" delay={0} />
      <KPICard label="Collected" value={financials.paidToYou} subtitle="Payments received" accentColor="emerald" delay={40} />
      <KPICard label="Outstanding" value={financials.totalRevenue - financials.paidToYou} subtitle="Remaining to collect" accentColor="amber" delay={80} />
    </div>
  );
}
