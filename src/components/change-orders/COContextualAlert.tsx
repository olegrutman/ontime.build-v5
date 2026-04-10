import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ChangeOrder, COFinancials } from '@/types/changeOrder';

interface COContextualAlertProps {
  co: ChangeOrder;
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  tcName?: string;
  fcCollabName?: string;
  financials?: COFinancials;
  onUseFCBase?: () => void;
}

interface AlertConfig {
  bg: string;
  border: string;
  text: string;
  action?: { label: string; onClick: () => void };
}

function getAlertConfig(props: COContextualAlertProps): AlertConfig | null {
  const { co, isGC, isTC, isFC, tcName, fcCollabName, financials, onUseFCBase } = props;
  const status = co.status;

  if (isFC) {
    if (['draft', 'shared', 'work_in_progress', 'closed_for_pricing'].includes(status)) {
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800',
        text: `${tcName ?? 'TC'} is waiting on your hours to price this CO`,
      };
    }
    if (status === 'submitted') {
      return {
        bg: 'bg-muted/40',
        border: 'border-border',
        text: 'Your hours have been submitted. Waiting on pricing.',
      };
    }
    return null;
  }

  if (isTC) {
    if (status === 'closed_for_pricing' && financials && financials.fcTotalHours > 0) {
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: `${fcCollabName ?? 'Field Crew'} submitted ${financials.fcTotalHours} hrs — use as your pricing base?`,
        action: onUseFCBase ? { label: 'Yes', onClick: onUseFCBase } : undefined,
      };
    }
    if (status === 'submitted') {
      return {
        bg: 'bg-muted/40',
        border: 'border-border',
        text: 'Submitted to General Contractor — waiting on approval.',
      };
    }
    if (['shared', 'work_in_progress'].includes(status)) {
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'Work in progress — add labor and close for pricing when ready.',
      };
    }
    return null;
  }

  if (isGC) {
    if (status === 'submitted') {
      const submittedAgo = co.submitted_at ? getTimeAgo(co.submitted_at) : '';
      return {
        bg: 'bg-primary/8 dark:bg-primary/15',
        border: 'border-primary/30',
        text: `${tcName ?? 'TC'} submitted for approval${submittedAgo ? ` ${submittedAgo}` : ''}`,
      };
    }
    if (status === 'work_in_progress') {
      return {
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'Work is in progress. Waiting on contractor pricing.',
      };
    }
    return null;
  }

  return null;
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

export function COContextualAlert(props: COContextualAlertProps) {
  const config = getAlertConfig(props);
  if (!config) return null;

  return (
    <div className={cn(
      'rounded-full border px-4 py-2 text-xs leading-relaxed flex items-center justify-between gap-2',
      config.bg, config.border,
    )}>
      <span>{config.text}</span>
      {config.action && (
        <Button
          size="sm"
          className="h-6 px-3 text-[0.65rem] rounded-full shrink-0"
          onClick={config.action.onClick}
        >
          {config.action.label}
        </Button>
      )}
    </div>
  );
}
