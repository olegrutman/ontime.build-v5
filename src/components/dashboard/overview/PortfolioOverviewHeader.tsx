import { ProjectHealthHero, computeHealthStatus, buildHealthSummary } from '@/components/project/overview/ProjectHealthHero';
import { OverviewSummaryStrip } from '@/components/project/overview/OverviewSummaryStrip';
import { CompactHealthHero } from './CompactHealthHero';

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
  /**
   * 'full'         — large hero + 3-card summary strip (legacy)
   * 'compact-hero' — single-row compact health pill + margin + summary
   * 'strip'        — 3-card summary strip only (no hero)
   */
  variant?: 'full' | 'compact-hero' | 'strip';
}

const ROLE_COPY: Record<string, { receivable: string; payable: string; contractLabel: string }> = {
  GC: { receivable: 'owners', payable: 'subs', contractLabel: 'owner' },
  TC: { receivable: 'GCs', payable: 'crews & suppliers', contractLabel: 'GC' },
  FC: { receivable: 'TCs/GCs', payable: 'labor & expenses', contractLabel: 'TC/GC' },
};

export function PortfolioOverviewHeader({
  orgType,
  financials,
  activeProjectCount,
  variant = 'full',
}: PortfolioOverviewHeaderProps) {
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
        pendingNetAtRisk: 0,
        approvedNet: financials.coApprovedNet,
        hasContract,
        roleLabel: copy.contractLabel,
      }) + ` Across ${activeProjectCount} active project${activeProjectCount === 1 ? '' : 's'}.`
    : `Set up your first ${copy.contractLabel} contract to see portfolio health.`;

  const strip = (
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
  );

  if (variant === 'compact-hero') {
    return (
      <CompactHealthHero
        status={status}
        projectedMargin={financials.projectedMarginRevised}
        projectedMarginPct={financials.projectedMarginRevisedPct}
        label="Projected Portfolio Margin"
        summary={summary}
      />
    );
  }

  if (variant === 'strip') {
    return strip;
  }

  return (
    <div className="flex flex-col gap-3">
      <ProjectHealthHero
        status={status}
        projectedMargin={financials.projectedMarginRevised}
        projectedMarginPct={financials.projectedMarginRevisedPct}
        label="Projected Portfolio Margin"
        summary={summary}
      />
      {strip}
    </div>
  );
}
