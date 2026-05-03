import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { COStatus, COFinancials } from '@/types/changeOrder';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import type { RoleLabels } from '@/hooks/useRoleLabels';

interface COStickyFooterProps {
  status: COStatus;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  financials: COFinancials;
  fcCollabName: string;
  onAction: (action: string) => void;
}

function fmtCurrency(value: number) {
  if (value === 0) return '$0';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface FooterConfig {
  label: string;
  className: string;
  disabled: boolean;
  action: string;
}

function getFooterConfig(props: COStickyFooterProps): FooterConfig | null {
  const { status, isGC, isTC, isFC, financials, fcCollabName } = props;
  const totalToApprove = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;

  if (isFC) {
    if (['draft', 'shared', 'work_in_progress', 'closed_for_pricing'].includes(status)) {
      if (financials.fcTotalHours > 0) {
        return { label: `🚀 Submit ${financials.fcTotalHours} hrs to Trade Contractor →`, className: 'bg-emerald-600 hover:bg-emerald-700 text-white', disabled: false, action: 'submit_to_tc' };
      }
      return { label: '⏱ Log hours first', className: 'bg-muted text-muted-foreground', disabled: true, action: '' };
    }
    if (status === 'submitted') {
      return { label: 'Waiting on Trade Contractor pricing', className: 'bg-muted text-muted-foreground', disabled: true, action: '' };
    }
    return null;
  }

  if (isTC) {
    if (status === 'closed_for_pricing') {
      return { label: `Submit ${fmtCurrency(financials.grandTotal)} to General Contractor →`, className: 'bg-[hsl(var(--amber))] text-[hsl(var(--navy))] hover:opacity-90', disabled: false, action: 'submit' };
    }
    if (['shared', 'work_in_progress'].includes(status)) {
      return { label: `Waiting on ${fcCollabName || 'Field Crew'} hours`, className: 'bg-muted text-muted-foreground', disabled: true, action: '' };
    }
    if (status === 'submitted') {
      return { label: 'Waiting on General Contractor approval', className: 'bg-muted text-muted-foreground', disabled: true, action: '' };
    }
    return null;
  }

  if (isGC) {
    if (status === 'submitted') {
      return { label: `✓ Approve ${fmtCurrency(totalToApprove)}`, className: 'bg-emerald-600 hover:bg-emerald-700 text-white', disabled: false, action: 'approve' };
    }
    return null;
  }

  return null;
}

export function COStickyFooter(props: COStickyFooterProps) {
  const config = getFooterConfig(props);
  if (!config) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-background/95 backdrop-blur border-t border-border md:hidden safe-area-bottom">
      <Button
        className={cn('w-full h-12 text-sm font-semibold rounded-xl', config.className)}
        disabled={config.disabled}
        onClick={() => config.action && props.onAction(config.action)}
      >
        {config.label}
      </Button>
    </div>
  );
}
