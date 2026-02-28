import { FileText } from 'lucide-react';
import { ProjectFinancials } from '@/hooks/useProjectFinancials';

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
}

interface ContractSummaryTileProps {
  financials: ProjectFinancials;
}

export function ContractSummaryTile({ financials }: ContractSummaryTileProps) {
  const { viewerRole, upstreamContract, workOrderTotal } = financials;

  if (viewerRole !== 'General Contractor' && viewerRole !== 'Trade Contractor') return null;

  const originalContract = upstreamContract?.contract_sum || 0;
  const currentTotal = originalContract + workOrderTotal;

  return (
    <div className="border bg-card p-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-1">
        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
          Contract Summary
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Original Contract</span>
          <span className="text-sm font-semibold tabular-nums">{fmt(originalContract)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">+ Approved Work Orders</span>
          <span className="text-sm font-semibold tabular-nums text-primary">{fmt(workOrderTotal)}</span>
        </div>
        <div className="border-t pt-1.5 flex items-center justify-between">
          <span className="text-xs font-medium">= Current Contract Total</span>
          <span className="text-lg font-bold tabular-nums">{fmt(currentTotal)}</span>
        </div>
      </div>
    </div>
  );
}
