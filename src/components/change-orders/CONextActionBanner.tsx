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
  isFCCollaborator?: boolean;
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
  const { co, isGC, isTC, isFC, isFCCollaborator, financials, fcCollabName } = props;
  const status = co.status;
  // Single source of truth: price the GC sees == price the TC submits (responsibility-aware).
  const priceToUpstream = financials.billableGrandTotal;

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

  if (isTC || isFC) {
    const upstream = isTC ? rl.GC : rl.TC;
    // FC collaborators submit their input via the complete_fc_change_order_input RPC
    // (action 'submit_to_tc'), not by flipping the entire CO to 'submitted'.
    const submitActionName = isFC && isFCCollaborator ? 'submit_to_tc' : 'submit';
    const canSubmitNow = (isFC && isFCCollaborator) || !!co.assigned_to_org_id;
    const submitAction = canSubmitNow
      ? { label: `Submit to ${upstream}`, action: submitActionName }
      : { label: `Assign ${upstream} to submit`, action: 'noop' };
    if (status === 'closed_for_pricing') {
      return {
        icon: <Send className="h-5 w-5" />,
        title: `Finalize pricing and submit ${fmtCurrency(priceToUpstream)} to ${upstream}`,
        subtitle: 'Review your pricing, then submit for approval',
        actions: [
          { label: `Submit to ${upstream}`, action: submitActionName, primary: true },
          { label: 'Add Materials', action: 'scroll_materials' },
        ],
      };
    }
    if (['shared', 'work_in_progress'].includes(status)) {
      // TC requests FC hours; FC has no downstream FC, so just builds price directly.
      if (isTC) {
        return {
          icon: <Zap className="h-5 w-5" />,
          title: `Request hours from ${fcCollabName} and add materials`,
          subtitle: 'Build your price — add labor, materials, then close for pricing',
          actions: [
            { label: 'Request FC Hours', action: 'request_fc', primary: true },
            { label: 'Add Materials', action: 'scroll_materials' },
            submitAction,
          ],
        };
      }
      return {
        icon: <Zap className="h-5 w-5" />,
        title: 'Build your price — add labor and materials',
        subtitle: `Log labor and materials, then close for pricing and submit to ${upstream}`,
        actions: [
          { label: 'Log Hours', action: 'log_hours', primary: true },
          { label: 'Add Materials', action: 'scroll_materials' },
          submitAction,
        ],
      };
    }
    if (status === 'draft') {
      return {
        icon: <Zap className="h-5 w-5" />,
        title: 'Build your price — add labor and materials',
        subtitle: `Log labor and materials, then submit to ${upstream}`,
        actions: [
          { label: 'Log Hours', action: 'log_hours', primary: true },
          { label: 'Add Materials', action: 'scroll_materials' },
          submitAction,
        ],
      };
    }
    if (status === 'submitted') {
      return {
        icon: <Clock className="h-5 w-5" />,
        title: `Waiting on ${upstream} approval`,
        subtitle: `Submitted ${fmtCurrency(priceToUpstream)} — you'll be notified when reviewed`,
        actions: [],
      };
    }
    return null;
  }

  return null;
}

export function CONextActionBanner(props: CONextActionBannerProps) {
  const rl = useRoleLabelsContext();
  const config = getBannerConfig(props, rl);
  if (!config) return null;

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(var(--navy))' }}>
      <div className="px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="flex items-start gap-3 sm:contents">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'hsl(var(--amber)/0.15)' }}>
            <span style={{ color: 'hsl(var(--amber))' }}>{config.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.6rem] uppercase tracking-[0.1em] font-medium" style={{ color: 'hsl(220 27% 65%)' }}>
              Next Action Required
            </p>
            <p className="text-sm font-bold text-white mt-0.5 break-words">{config.title}</p>
            <p className="text-[0.7rem] mt-0.5 break-words" style={{ color: 'hsl(220 27% 60%)' }}>
              {config.subtitle}
            </p>
          </div>
        </div>
        {config.actions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {config.actions.map(a => (
              <Button
                key={a.action}
                size="sm"
                onClick={() => props.onAction(a.action)}
                className={cn(
                  'h-9 text-xs font-semibold rounded-lg flex-1 sm:flex-none min-w-[7rem]',
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
