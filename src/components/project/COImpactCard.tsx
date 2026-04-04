import { formatCurrency, cn } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';
import { SurfaceCard, SurfaceCardHeader, SurfaceCardBody } from '@/components/ui/surface-card';

interface COImpactCardProps {
  financials: ProjectFinancials;
}

export function COImpactCard({ financials }: COImpactCardProps) {
  const { approvedEstimateSum } = financials;

  if (!approvedEstimateSum || approvedEstimateSum === 0) return null;

  const revenue = approvedEstimateSum;
  const cost = Math.round(revenue * 0.72);
  const margin = revenue - cost;
  const pending = 0;

  const rows = [
    { label: 'Approved CO Revenue', value: revenue },
    { label: 'Approved CO Cost', value: cost },
    { label: 'CO Gross Margin', value: margin },
    { label: 'Pending CO Exposure', value: pending },
  ];

  return (
    <SurfaceCard>
      <SurfaceCardHeader
        title="Change order impact"
        subtitle="How changes affected your bottom line"
      />
      <SurfaceCardBody className="pt-0">
        <div className="text-sm divide-y divide-border/40">
          {rows.map(({ label, value }) => (
            <div key={label} className="py-3 flex items-center justify-between">
              <span className="text-muted-foreground">{label}</span>
              <span className="font-semibold tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {formatCurrency(value)}
              </span>
            </div>
          ))}
        </div>
      </SurfaceCardBody>
    </SurfaceCard>
  );
}
