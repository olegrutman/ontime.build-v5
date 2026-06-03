import { ProjectHealthHero, computeHealthStatus, buildHealthSummary } from '@/components/project/overview/ProjectHealthHero';
import { OverviewSummaryStrip } from '@/components/project/overview/OverviewSummaryStrip';

interface PortfolioOverviewHeaderProps {
  orgType: 'GC' | 'TC' | 'FC' | string | null;
  financials: {
    totalRevenue: number;
    totalCosts: number;
    paidToYou: number;
    paidByYou: number;
    cashPosition: number;
    pendingInvoiced: number;
    pendingToPay: number;
    pendingUnbilled: number;
    revisedRevenue: number;
    revisedCosts: number;
    projectedMarginRevised: number;
    projectedMarginRevisedPct: number;
    coApprovedCount: number;
    coPendingCount: number;
    coApprovedNet: number;
    coPendingNetAtRisk: number;
  };
  activeProjectCount: number;
}

const ROLE_COPY: Record<string, { receivable: string; payable: string; contractLabel: string }> = {
  GC: { receivable: 'owners', payable: 'subs', contractLabel: 'owner' },
  TC: { receivable: 'GCs', payable: 'crews & suppliers', contractLabel: 'GC' },
  FC: { receivable: 'TCs/GCs', payable: 'labor & expenses', contractLabel: 'TC/GC' },
};

export function PortfolioOverviewHeader({ orgType, financials, activeProjectCount }: PortfolioOverviewHeaderProps) {
  const copy = ROLE_COPY[orgType || 'TC'] || ROLE_COPY.TC;
  const hasContract = financials.revisedRevenue > 0;

  const status = computeHealthStatus(
    financials.projectedMarginRevisedPct,
    financials.cashPosition,
    financials.coPendingNetAtRisk,
    financials.coApprovedNet,
    hasContract,
  );

  const summary = hasContract
    ? buildHealthSummary({
        projectedMarginPct: financials.projectedMarginRevisedPct,
        cashPosition: financials.cashPosition,
        pendingNetAtRisk: 0, // contract-impact, not margin — don't double-count in summary
        approvedNet: financials.coApprovedNet,
        hasContract,
        roleLabel: copy.contractLabel,
      }) + ` Across ${activeProjectCount} active project${activeProjectCount === 1 ? '' : 's'}.`
    : `Set up your first ${copy.contractLabel} contract to see portfolio health.`;

  return (
    <div className="flex flex-col gap-3">
      <ProjectHealthHero
        status={status}
        projectedMargin={financials.projectedMarginRevised}
        projectedMarginPct={financials.projectedMarginRevisedPct}
        label="Projected Portfolio Margin"
        summary={summary}
      />
      <OverviewSummaryStrip
        contract={{
          label: 'Portfolio',
          revisedIn: financials.revisedRevenue,
          revisedOut: financials.revisedCosts,
          margin: financials.projectedMarginRevised,
          marginPct: financials.projectedMarginRevisedPct,
        }}
        cashFlow={{
          received: financials.paidToYou,
          paid: financials.paidByYou,
          cashPosition: financials.cashPosition,
          owedToYou: financials.pendingInvoiced + financials.pendingUnbilled,
          youOwe: financials.pendingToPay,
        }}
        changeOrders={{
          approvedCount: financials.coApprovedCount,
          pendingCount: financials.coPendingCount,
          approvedNet: financials.coApprovedNet,
          pendingNetAtRisk: financials.coPendingNetAtRisk,
        }}
        receivablePartyLabel={copy.receivable}
        payablePartyLabel={copy.payable}
      />
    </div>
  );
}
