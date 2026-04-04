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

function FinancialKPI({ label, value, accentColor, delay = 0, suffix }: FinancialKPIProps) {
  const animated = useCountUp(value, 900, delay);
  return (
    <div className="rounded-3xl border border-border/60 p-5 bg-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight text-foreground leading-none" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {formatCurrency(animated)}
        </span>
        {suffix && (
          <span className="text-xs font-semibold text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

interface ProjectFinancialCommandProps {
  financials: ProjectFinancials;
}

export function ProjectFinancialCommand({ financials }: ProjectFinancialCommandProps) {
  const { viewerRole, contracts, upstreamContract, downstreamContract, approvedEstimateSum } = financials;

  if (viewerRole === 'General Contractor') {
    const originalContract = upstreamContract?.contract_sum || 0;
    const coAdds = approvedEstimateSum || 0;
    const revised = originalContract + coAdds;
    const totalCostOut = contracts
      .filter(c => c.to_org_id !== financials.userOrgIds[0])
      .reduce((sum, c) => sum + (c.contract_sum || 0), 0);
    const margin = revised > 0 ? ((revised - totalCostOut) / revised) * 100 : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <FinancialKPI label="Original Contract" value={originalContract} accentColor="primary" delay={0} />
        <FinancialKPI label="Approved CO Adds" value={coAdds} accentColor="blue" delay={40} />
        <FinancialKPI label="Revised Contract" value={revised} accentColor="primary" delay={80} />
        <FinancialKPI label="Estimated Total Cost" value={totalCostOut} accentColor="amber" delay={120} />
        <FinancialKPI label="Projected Gross Margin" value={revised - totalCostOut} accentColor={margin >= 10 ? 'emerald' : 'red'} delay={160} suffix={`${Math.round(margin)}%`} />
      </div>
    );
  }

  if (viewerRole === 'Trade Contractor') {
    const contractIn = upstreamContract?.contract_sum || 0;
    const coAdds = approvedEstimateSum || 0;
    const revised = contractIn + coAdds;
    const costOut = downstreamContract?.contract_sum || 0;
    const margin = revised > 0 ? ((revised - costOut) / revised) * 100 : 0;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <FinancialKPI label="Original Contract" value={contractIn} accentColor="primary" delay={0} />
        <FinancialKPI label="Approved CO Adds" value={coAdds} accentColor="blue" delay={40} />
        <FinancialKPI label="Revised Contract" value={revised} accentColor="primary" delay={80} />
        <FinancialKPI label="Estimated Total Cost" value={costOut} accentColor="amber" delay={120} />
        <FinancialKPI label="Projected Gross Margin" value={revised - costOut} accentColor={margin >= 10 ? 'emerald' : 'red'} delay={160} suffix={`${Math.round(margin)}%`} />
      </div>
    );
  }

  // FC
  const fcContract = downstreamContract?.contract_sum || upstreamContract?.contract_sum || 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <FinancialKPI label="Contract Value" value={fcContract} accentColor="primary" delay={0} />
      <FinancialKPI label="Collected" value={financials.receivablesCollected} accentColor="emerald" delay={40} />
      <FinancialKPI label="Outstanding" value={fcContract - financials.receivablesCollected} accentColor="amber" delay={80} />
    </div>
  );
}
