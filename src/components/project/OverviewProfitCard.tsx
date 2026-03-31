import { cn, formatCurrency as fmt } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { useProjectActualCosts } from '@/hooks/useActualCosts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Props {
  projectId: string;
  financials: ProjectFinancials;
}

export function OverviewProfitCard({ projectId, financials }: Props) {
  const { totalActualCost } = useProjectActualCosts(projectId);
  const { viewerRole, upstreamContract, downstreamContract, ownerContractValue, isTCMaterialResponsible, materialOrdered, materialMarkupType, materialMarkupValue } = financials;

  const contractSum = upstreamContract?.contract_sum ?? 0;

  let rows: { label: string; value: number }[] = [];
  let profit = 0;
  let profitLabel = 'Your Profit';

  if (viewerRole === 'General Contractor') {
    const ownerVal = ownerContractValue ?? 0;
    if (ownerVal === 0 && contractSum === 0) return null;
    profit = ownerVal - contractSum;
    profitLabel = 'Your Profit';
    rows = [
      { label: 'Owner Contract', value: ownerVal },
      { label: upstreamContract?.to_org_name || 'Trade Contractor', value: contractSum },
    ];
  } else if (viewerRole === 'Trade Contractor') {
    const fcName = downstreamContract?.to_org_name || 'Field Crew';
    const fcContractSum = downstreamContract?.contract_sum ?? 0;
    const laborMargin = contractSum - fcContractSum - totalActualCost;

    if (isTCMaterialResponsible && materialMarkupValue && materialOrdered > 0) {
      const markupAmount = materialMarkupType === 'percent'
        ? materialOrdered * ((materialMarkupValue || 0) / 100)
        : (materialMarkupValue || 0);
      profit = laborMargin + markupAmount;
      profitLabel = 'Total Profit';
      rows = [
        { label: 'Labor Margin', value: laborMargin },
        { label: 'Material Markup', value: markupAmount },
      ];
    } else {
      profit = laborMargin;
      profitLabel = 'Labor Margin';
      rows = [
        { label: upstreamContract?.from_org_name || 'Revenue (Contract)', value: contractSum },
        { label: `${fcName} Contract`, value: fcContractSum },
        ...(totalActualCost > 0 ? [{ label: 'Actual Costs', value: -totalActualCost }] : []),
      ];
    }
  } else if (viewerRole === 'Field Crew') {
    if (contractSum === 0 && totalActualCost === 0) return null;
    profit = contractSum - totalActualCost;
    profitLabel = 'Your Profit';
    rows = [
      { label: 'Contract', value: contractSum },
      { label: 'Actual Cost', value: -totalActualCost },
    ];
  } else {
    return null;
  }

  const pct = rows[0]?.value > 0 ? (profit / rows[0].value) * 100 : 0;
  const isPositive = profit > 0;
  const isZero = profit === 0;
  const TrendIcon = isPositive ? TrendingUp : isZero ? Minus : TrendingDown;

  return (
    <div className="space-y-2">
      <p className={DT.sectionHeader}>Profit Position</p>

      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-xs animate-fade-in" style={{ animationDelay: `${i * 40}ms` }}>
            <span className="text-muted-foreground">{r.label}</span>
            <span className="font-medium" style={DT.mono}>{fmt(Math.abs(r.value))}</span>
          </div>
        ))}
      </div>

      <div className={cn(
        'flex items-center justify-between rounded-md px-3 py-2 mt-1',
        isPositive ? 'bg-emerald-50 border border-emerald-200' :
        isZero ? 'bg-muted border border-border' :
        'bg-red-50 border border-red-200'
      )}>
        <div className="flex items-center gap-1.5">
          <TrendIcon className={cn('w-3.5 h-3.5', isPositive ? 'text-emerald-600' : isZero ? 'text-muted-foreground' : 'text-red-600')} />
          <span className="text-xs font-medium text-foreground">{profitLabel}</span>
        </div>
        <div className="text-right">
          <span className={cn('text-sm font-semibold', isPositive ? 'text-emerald-700' : isZero ? 'text-foreground' : 'text-red-700')} style={DT.mono}>
            {fmt(profit)}
          </span>
          {pct !== 0 && (
            <span className="text-[10px] text-muted-foreground ml-1">({pct.toFixed(1)}%)</span>
          )}
        </div>
      </div>
    </div>
  );
}
