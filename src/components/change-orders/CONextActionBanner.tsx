import { cn } from '@/lib/utils';
import { AlertTriangle, Send, Lock, ClipboardList, Clock, CheckCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChangeOrder, COFinancials } from '@/types/changeOrder';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import type { RoleLabels } from '@/hooks/useRoleLabels';

interface CONextActionBannerProps {
  co: ChangeOrder;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  financials: COFinancials;
  fcCollabName: string;
  onAction: (action: string) => void;
}

interface BannerConfig {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actions: { label: string; action: string; primary?: boolean }[];
}

function fmtCurrency(value: number) {
  if (value === 0) return '$0';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getBannerConfig(props: CONextActionBannerProps, rl: RoleLabels): BannerConfig | null {
  const { co, isGC, isTC, isFC, financials, fcCollabName } = props;
  const status = co.status;
  // Single source of truth: price the GC sees == price the TC submits.
  const priceToUpstream = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;

  if (isGC) {
    if (status === 'submitted') {
      return {
        icon: <CheckCircle className="h-5 w-5" />,
        title: `Review & approve ${fmtCurrency(priceToUpstream)}`,
        subtitle: 'TC submitted this work order for your approval',
        actions: [
          { label: 'Approve', action: 'approve', primary: true },
          { label: 'Reject', action: 'reject' },
        ],
      };
    }
    if (status === 'work_in_progress') {
      return {
        icon: <Clock className="h-5 w-5" />,
        title: 'Work in progress — waiting on contractor pricing',
        subtitle: 'Close for pricing when scope is finalized',
        actions: [
          { label: 'Close for Pricing', action: 'close_for_pricing', primary: true },
          { label: 'Review Scope', action: 'scroll_scope' },
        ],
      };
    }
    return null;
  }

  if (isTC) {
    if (status === 'closed_for_pricing') {
      return {
        icon: <Send className="h-5 w-5" />,
        title: `Finalize pricing and submit ${fmtCurrency(priceToUpstream)} to GC`,
        subtitle: 'Review your pricing, then submit for approval',
        actions: [
          { label: 'Submit to GC', action: 'submit', primary: true },
          { label: 'Add Materials', action: 'scroll_materials' },
        ],
      };
    }
    if (['shared', 'work_in_progress'].includes(status)) {
      return {
        icon: <Zap className="h-5 w-5" />,
        title: `Request hours from ${fcCollabName} and add materials`,
        subtitle: 'Build your price — add labor, materials, then close for pricing',
        actions: [
          { label: 'Request FC Hours', action: 'request_fc', primary: true },
          { label: 'Add Materials', action: 'scroll_materials' },
        ],
      };
    }
    if (status === 'submitted') {
      return {
        icon: <Clock className="h-5 w-5" />,
        title: 'Waiting on General Contractor approval',
        subtitle: `Submitted ${fmtCurrency(priceToUpstream)} — you'll be notified when reviewed`,
        actions: [],
      };
    }
    return null;
  }

  // FC
  if (['draft', 'shared', 'work_in_progress', 'closed_for_pricing'].includes(status)) {
    return {
      icon: <Clock className="h-5 w-5" />,
      title: financials.fcTotalHours > 0 ? `${financials.fcTotalHours} hours logged — submit when ready` : 'Log your hours for this work order',
      subtitle: 'Add time entries then submit to your Trade Contractor',
      actions: [
        { label: 'Log Hours', action: 'log_hours', primary: true },
        ...(financials.fcTotalHours > 0 ? [{ label: 'Submit to TC', action: 'submit_to_tc' }] : []),
      ],
    };
  }

  return null;
}

export function CONextActionBanner(props: CONextActionBannerProps) {
  const config = getBannerConfig(props);
  if (!config) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(var(--navy))' }}>
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--amber)/0.15)' }}>
          <span style={{ color: 'hsl(var(--amber))' }}>{config.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[0.6rem] uppercase tracking-[0.1em] font-medium" style={{ color: 'hsl(220 27% 65%)' }}>
            Next Action Required
          </p>
          <p className="text-sm font-bold text-white mt-0.5">{config.title}</p>
          <p className="text-[0.7rem] mt-0.5" style={{ color: 'hsl(220 27% 60%)' }}>
            {config.subtitle}
          </p>
        </div>
        {config.actions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            {config.actions.map(a => (
              <Button
                key={a.action}
                size="sm"
                onClick={() => props.onAction(a.action)}
                className={cn(
                  'h-9 text-xs font-semibold rounded-lg',
                  a.primary
                    ? 'bg-[hsl(var(--amber))] text-[hsl(var(--navy))] hover:opacity-90'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/10',
                )}
              >
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
