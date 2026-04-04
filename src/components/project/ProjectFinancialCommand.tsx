import { KPICard } from '@/components/ui/kpi-card';
import { formatCurrency } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
        <KPICard label="Original Contract" value={originalContract} delay={0} className="p-3" />
        <KPICard label="Approved CO Adds" value={coAdds} delay={40} className="p-3" />
        <KPICard label="Revised Contract" value={revised} delay={80} className="p-3" />
        <KPICard label="Estimated Total Cost" value={totalCostOut} delay={120} className="p-3" />
        <KPICard label="Projected Gross Margin" value={revised - totalCostOut} delay={160} suffix={`${Math.round(margin)}%`} className="p-3" />
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
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
        <KPICard label="Original Contract" value={contractIn} delay={0} className="p-3" />
        <KPICard label="Approved CO Adds" value={coAdds} delay={40} className="p-3" />
        <KPICard label="Revised Contract" value={revised} delay={80} className="p-3" />
        <KPICard label="Estimated Total Cost" value={costOut} delay={120} className="p-3" />
        <KPICard label="Projected Gross Margin" value={revised - costOut} delay={160} suffix={`${Math.round(margin)}%`} className="p-3" />
      </div>
    );
  }

  // FC
  const fcContract = downstreamContract?.contract_sum || upstreamContract?.contract_sum || 0;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <KPICard label="Contract Value" value={fcContract} delay={0} />
      <KPICard label="Collected" value={financials.receivablesCollected} delay={40} />
      <KPICard label="Outstanding" value={fcContract - financials.receivablesCollected} delay={80} />
    </div>
  );
}
