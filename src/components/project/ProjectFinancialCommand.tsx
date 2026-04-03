import { formatCurrency } from '@/lib/utils';
import { useCountUp } from '@/hooks/useCountUp';
import { cn } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

interface FinancialKPIProps {
  label: string;
  value: number;
  accentColor: 'primary' | 'emerald' | 'amber' | 'blue' | 'red';
  delay?: number;
  suffix?: string;
}

const ACCENT = {
  primary: 'bg-primary',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  blue: 'bg-blue-500',
  red: 'bg-red-500',
};

function FinancialKPI({ label, value, accentColor, delay = 0, suffix }: FinancialKPIProps) {
  const animated = useCountUp(value, 900, delay);
  return (
    <div className="rounded-xl bg-card border border-border/60 shadow-sm px-3.5 py-3 relative overflow-hidden">
      <div className={cn('absolute bottom-0 left-0 right-0 h-[2px]', ACCENT[accentColor])} />
      <p className="text-[0.65rem] uppercase tracking-wide text-muted-foreground font-medium mb-1">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-heading text-xl sm:text-2xl font-black tracking-tight text-foreground leading-none" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {formatCurrency(animated)}
        </span>
        {suffix && (
          <span className="text-[0.6rem] font-semibold text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

interface ProjectFinancialCommandProps {
  financials: ProjectFinancials;
}

export function ProjectFinancialCommand({ financials }: ProjectFinancialCommandProps) {
  const { viewerRole, contracts, upstreamContract, downstreamContract } = financials;

  if (viewerRole === 'General Contractor') {
    const originalContract = upstreamContract?.contract_sum || 0;
    const totalCostOut = contracts
      .filter(c => c.to_org_id !== financials.userOrgIds[0])
      .reduce((sum, c) => sum + (c.contract_sum || 0), 0);
    const margin = originalContract > 0 ? ((originalContract - totalCostOut) / originalContract) * 100 : 0;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <FinancialKPI label="Contract Value" value={originalContract} accentColor="primary" delay={0} />
        <FinancialKPI label="Cost Out" value={totalCostOut} accentColor="amber" delay={40} />
        <FinancialKPI label="Billed to Date" value={financials.billedToDate} accentColor="blue" delay={80} />
        <FinancialKPI label="Projected Margin" value={originalContract - totalCostOut} accentColor={margin >= 10 ? 'emerald' : 'red'} delay={120} suffix={`${Math.round(margin)}%`} />
      </div>
    );
  }

  if (viewerRole === 'Trade Contractor') {
    const contractIn = upstreamContract?.contract_sum || 0;
    const costOut = downstreamContract?.contract_sum || 0;
    const margin = contractIn > 0 ? ((contractIn - costOut) / contractIn) * 100 : 0;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <FinancialKPI label="Contract In" value={contractIn} accentColor="primary" delay={0} />
        <FinancialKPI label="Cost Out" value={costOut} accentColor="amber" delay={40} />
        <FinancialKPI label="Collected" value={financials.receivablesCollected} accentColor="blue" delay={80} />
        <FinancialKPI label="Projected Margin" value={contractIn - costOut} accentColor={margin >= 10 ? 'emerald' : 'red'} delay={120} suffix={`${Math.round(margin)}%`} />
      </div>
    );
  }

  // FC
  const fcContract = downstreamContract?.contract_sum || upstreamContract?.contract_sum || 0;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
      <FinancialKPI label="Contract Value" value={fcContract} accentColor="primary" delay={0} />
      <FinancialKPI label="Collected" value={financials.receivablesCollected} accentColor="emerald" delay={40} />
      <FinancialKPI label="Outstanding" value={fcContract - financials.receivablesCollected} accentColor="amber" delay={80} />
    </div>
  );
}
