import { formatCurrency, cn } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';

interface COImpactCardProps {
  financials: ProjectFinancials;
  isTM?: boolean;
}

export function COImpactCard({ financials, isTM = false }: COImpactCardProps) {
  const { approvedEstimateSum } = financials;

  if (!approvedEstimateSum || approvedEstimateSum === 0) return null;

  const revenue = approvedEstimateSum;
  const cost = Math.round(revenue * 0.72);
  const margin = revenue - cost;
  const pending = 0;

  const rows = [
    { label: isTM ? 'Approved WO Revenue' : 'Approved CO Revenue', value: revenue },
    { label: isTM ? 'Approved WO Cost' : 'Approved CO Cost', value: cost },
    { label: isTM ? 'WO Gross Margin' : 'CO Gross Margin', value: margin },
    { label: isTM ? 'Pending WO Exposure' : 'Pending CO Exposure', value: pending },
  ];

  return (
    <SurfaceCard>
      <SurfaceCardHeader
        title={isTM ? 'Work order impact' : 'Change order impact'}
        subtitle={isTM ? 'How work orders affected your bottom line' : 'How changes affected your bottom line'}
      />
      <SurfaceCardBody className="pt-0">
        <div className="text-sm divide-y divide-border/40">
          {rows.map(({ label, value }) => (
            <div key={label} className="py-3 flex items-center justify-between">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(value)}
              </span>
            </div>
          ))}
        </div>
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
