import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  AlertTriangle,
  CircleAlert,
  Info,
  CheckCircle2,
  DollarSign,
  CalendarCheck,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ProjectQuickStats, ActionItem } from '@/hooks/useProjectQuickStats';

interface ProjectQuickOverviewProps {
  projectId: string;
  stats: ProjectQuickStats;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

const SEVERITY_STYLES = {
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800/40',
    text: 'text-red-700 dark:text-red-300',
    icon: AlertTriangle,
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/40',
    text: 'text-amber-700 dark:text-amber-300',
    icon: CircleAlert,
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800/40',
    text: 'text-blue-700 dark:text-blue-300',
    icon: Info,
  },
};

function ActionChip({
  item,
  onClick,
}: {
  item: ActionItem;
  onClick: () => void;
}) {
  const style = SEVERITY_STYLES[item.severity];
  const Icon = style.icon;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'flex items-center gap-2 w-full rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors hover:opacity-80',
        style.bg,
        style.border,
        style.text
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">
        {item.label}
        {item.amount != null && item.amount > 0 && (
          <span className="ml-1 font-semibold">({formatCurrency(item.amount)})</span>
        )}
      </span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
    </button>
  );
}

export function ProjectQuickOverview({ projectId, stats }: ProjectQuickOverviewProps) {
  const navigate = useNavigate();

  if (stats.loading) {
    return (
      <div className="space-y-3 pt-3 pb-1">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-3/4 rounded-lg" />
        <Skeleton className="h-8 w-full rounded" />
      </div>
    );
  }

  const hasActions = stats.actionItems.length > 0;

  const navigateToTab = (tab?: string) => {
    const base = `/project/${projectId}`;
    navigate(tab ? `${base}?tab=${tab}` : base);
  };

  return (
    <div className="space-y-3 pt-3 pb-1">
      {/* Action Items */}
      {hasActions ? (
        <div className="space-y-1.5">
          {stats.actionItems.map((item) => (
            <ActionChip
              key={item.key}
              item={item}
              onClick={() => navigateToTab(item.tab)}
            />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          All clear — no items need attention
        </div>
      )}

      {/* Compact Metrics Row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
        {stats.budgetTotal > 0 && (
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span>
              Billed: <span className="font-semibold text-foreground">{formatCurrency(stats.budgetUsed)}</span>
            </span>
          </div>
        )}
        {stats.outstandingBilling > 0 && (
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>
              Outstanding: <span className="font-semibold text-foreground">{formatCurrency(stats.outstandingBilling)}</span>
            </span>
          </div>
        )}
        {stats.schedulePercent > 0 && (
          <div className="flex items-center gap-1">
            <CalendarCheck className="h-3 w-3" />
            <span>
              Schedule: <span className="font-semibold text-foreground">{stats.schedulePercent}%</span>
            </span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex justify-end pt-0.5">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/project/${projectId}`);
          }}
        >
          View Full Project
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
