import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  photoCount?: number;
  photosBlocked?: boolean;
  onOpenCamera?: () => void;
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

function getFooterConfig(props: COStickyFooterProps, rl: RoleLabels): FooterConfig | null {
  const { status, isGC, isTC, isFC, financials, fcCollabName } = props;
  const totalToApprove = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;

  if (isFC) {
    if (['draft', 'shared', 'work_in_progress', 'closed_for_pricing'].includes(status)) {
      if (financials.fcTotalHours > 0) {
        return { label: `🚀 Submit ${financials.fcTotalHours} hrs to ${rl.TC} →`, className: 'bg-emerald-600 hover:bg-emerald-700 text-white', disabled: false, action: 'submit_to_tc' };
      }
      return { label: '⏱ Log hours first', className: 'bg-muted text-muted-foreground', disabled: true, action: '' };
    }
    if (status === 'submitted') {
      return { label: `Waiting on ${rl.TC} pricing`, className: 'bg-muted text-muted-foreground', disabled: true, action: '' };
    }
    return null;
  }

  if (isTC) {
    if (status === 'closed_for_pricing') {
      return { label: `Submit ${fmtCurrency(financials.grandTotal)} to ${rl.GC} →`, className: 'bg-[hsl(var(--amber))] text-[hsl(var(--navy))] hover:opacity-90', disabled: false, action: 'submit' };
    }
    if (['shared', 'work_in_progress'].includes(status)) {
      return { label: `Waiting on ${fcCollabName || rl.FC} hours`, className: 'bg-muted text-muted-foreground', disabled: true, action: '' };
    }
    if (status === 'submitted') {
      return { label: `Waiting on ${rl.GC} approval`, className: 'bg-muted text-muted-foreground', disabled: true, action: '' };
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

const ACTIVE_STATUSES = new Set<string>(['draft', 'shared', 'work_in_progress', 'closed_for_pricing']);

export function COStickyFooter(props: COStickyFooterProps) {
  const rl = useRoleLabelsContext();
  const config = getFooterConfig(props, rl);
  const { photoCount = 0, photosBlocked, onOpenCamera, status } = props;

  const showCameraButton = ACTIVE_STATUSES.has(status) && photoCount === 0 && !!onOpenCamera;

  if (!config && !showCameraButton) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-background/95 backdrop-blur border-t border-border md:hidden safe-area-bottom">
      <div className="flex items-center gap-2">
        {/* Camera shortcut */}
        {showCameraButton && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-xl shrink-0 border-amber-300 text-amber-700 dark:text-amber-400"
                onClick={onOpenCamera}
              >
                <Camera className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Take photo</TooltipContent>
          </Tooltip>
        )}

        {/* Main action */}
        {config && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={cn('flex-1 h-12 text-sm font-semibold rounded-xl', config.className)}
                disabled={config.disabled || photosBlocked}
                onClick={() => config.action && props.onAction(config.action)}
              >
                {config.label}
              </Button>
            </TooltipTrigger>
            {photosBlocked && (
              <TooltipContent side="top">
                At least 1 photo is required before submitting
              </TooltipContent>
            )}
          </Tooltip>
        )}
      </div>
    </div>
  );
}
