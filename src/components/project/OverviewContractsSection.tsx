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

  const rows: { fromName: string; toName: string; fromRole: string; toRole: string; sum: number; retainage: number }[] = [];

  if (viewerRole === 'Trade Contractor') {
    if (upstreamContract) {
      rows.push({
        fromName: upstreamContract.from_org_name || 'General Contractor',
        toName: upstreamContract.to_org_name || 'Your Company',
        fromRole: 'GC',
        toRole: 'TC',
        sum: upstreamContract.contract_sum,
        retainage: upstreamContract.retainage_percent,
      });
    }
  }

  if (viewerRole === 'Field Crew') {
    if (downstreamContract) {
      rows.push({
        fromName: downstreamContract.from_org_name || 'Trade Contractor',
        toName: downstreamContract.to_org_name || 'Your Company',
        fromRole: 'TC',
        toRole: 'FC',
        sum: downstreamContract.contract_sum,
        retainage: downstreamContract.retainage_percent,
      });
    }
  }

  if (viewerRole === 'General Contractor') {
    if (upstreamContract) {
      rows.push({
        fromName: upstreamContract.from_org_name || 'Your Company',
        toName: upstreamContract.to_org_name || 'Trade Contractor',
        fromRole: 'GC',
        toRole: 'TC',
        sum: upstreamContract.contract_sum,
        retainage: upstreamContract.retainage_percent,
      });
    }
  }

  if (viewerRole === 'Trade Contractor' && downstreamContract) {
    rows.push({
      fromName: downstreamContract.from_org_name || 'Your Company',
      toName: downstreamContract.to_org_name || 'Field Crew',
      fromRole: 'TC',
      toRole: 'FC',
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
              <span className="text-sm font-semibold text-foreground" style={DT.mono}>{fmt(row.sum)}</span>
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
