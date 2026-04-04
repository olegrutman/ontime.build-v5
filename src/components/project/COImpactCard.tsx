import { formatCurrency, cn } from '@/lib/utils';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

interface COImpactCardProps {
  financials: ProjectFinancials;
}

export function COImpactCard({ financials }: COImpactCardProps) {
  const { approvedEstimateSum } = financials;
  
  if (!approvedEstimateSum || approvedEstimateSum === 0) return null;

  const revenue = approvedEstimateSum;
  const cost = Math.round(revenue * 0.72); // approximate
  const margin = revenue - cost;
  const pending = 0;

  const rows = [
    { label: 'Approved CO Revenue', value: revenue },
    { label: 'Approved CO Cost', value: cost },
    { label: 'CO Gross Margin', value: margin },
    { label: 'Pending CO Exposure', value: pending },
  ];

  return (
    <div className="rounded-3xl border border-border/60 p-5 bg-card shadow-sm">
      <h3 className="text-xl font-semibold tracking-tight">Change order impact</h3>
      <p className="text-sm text-muted-foreground">How changes affected your bottom line</p>
      <div className="mt-5 text-sm divide-y divide-border/40">
        {rows.map(({ label, value }) => (
          <div key={label} className="py-3 flex items-center justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {formatCurrency(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
