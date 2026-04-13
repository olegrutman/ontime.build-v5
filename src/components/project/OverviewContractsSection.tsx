import { cn, formatCurrency as fmt } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import { ProjectFinancials, ViewerRole } from '@/hooks/useProjectFinancials';
import { FileText, ArrowRight } from 'lucide-react';

interface Props {
  financials: ProjectFinancials;
  onNavigate: (tab: string) => void;
}

export function OverviewContractsSection({ financials, onNavigate }: Props) {
  const { viewerRole, upstreamContract, downstreamContract } = financials;

  const roleDisplay = (role: string) => role;

  const rows: { fromName: string; toName: string; fromRole: string; toRole: string; sum: number; retainage: number }[] = [];

  if (upstreamContract) {
    rows.push({
      fromName: upstreamContract.from_org_name || upstreamContract.from_role || 'Unknown',
      toName: upstreamContract.to_org_name || upstreamContract.to_role || 'Unknown',
      fromRole: roleDisplay(upstreamContract.from_role),
      toRole: roleDisplay(upstreamContract.to_role),
      sum: upstreamContract.contract_sum,
      retainage: upstreamContract.retainage_percent,
    });
  }

  // GC should not see the downstream (TC↔FC) contract
  if (downstreamContract && viewerRole !== 'General Contractor') {
    rows.push({
      fromName: downstreamContract.from_org_name || downstreamContract.from_role || 'Unknown',
      toName: downstreamContract.to_org_name || downstreamContract.to_role || 'Unknown',
      fromRole: roleDisplay(downstreamContract.from_role),
      toRole: roleDisplay(downstreamContract.to_role),
      sum: downstreamContract.contract_sum,
      retainage: downstreamContract.retainage_percent,
    });
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className={DT.sectionHeader}>Contracts</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {rows.map((row, i) => (
          <button
            key={i}
            onClick={() => onNavigate('sov')}
            className="w-full text-left bg-card border border-border rounded-lg px-3.5 py-3 hover:bg-accent/30 transition-colors animate-fade-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Contract</span>
            </div>
            <p className="text-xs text-foreground font-medium truncate">
              {row.fromName}
              <span className="text-[10px] text-muted-foreground ml-1">({row.fromRole})</span>
              <span className="text-muted-foreground mx-1">→</span>
              {row.toName}
              <span className="text-[10px] text-muted-foreground ml-1">({row.toRole})</span>
            </p>
            <div className="flex items-center justify-between mt-1.5">
              <span className="font-mono text-sm font-semibold text-foreground">{fmt(row.sum)}</span>
              <span className="text-[10px] text-muted-foreground">Ret. {row.retainage}%</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-primary">
              <span className="text-[10px] font-medium">View SOV</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
