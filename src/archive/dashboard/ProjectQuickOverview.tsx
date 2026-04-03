// Archived during dashboard + overview redesign. Kept for reference only. Not used in active UI.
import { useMemo } from 'react';
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
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { ProjectQuickStats, ActionItem, CriticalScheduleItem } from '@/hooks/useProjectQuickStats';

interface ProjectQuickOverviewProps {
  projectId: string;
  stats: ProjectQuickStats;
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

function CriticalScheduleSection({
  items,
  totalCount,
  onNavigate,
}: {
  items: CriticalScheduleItem[];
  totalCount: number;
  onNavigate: (tab: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate('schedule');
        }}
        className="flex items-center justify-between w-full px-3 py-2 hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            Critical Schedule
          </span>
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
            {totalCount}
          </Badge>
        </div>
        {totalCount > items.length && (
          <span className="text-[11px] text-muted-foreground">
            +{totalCount - items.length} more
          </span>
        )}
      </button>

      <div className="px-3 pb-2.5 space-y-1.5">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('schedule');
            }}
            className="w-full text-left rounded-lg bg-muted/50 p-2.5 hover:bg-accent/40 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium truncate pr-2">{item.title}</span>
              {item.isOverdue ? (
                <Badge className="bg-destructive/10 text-destructive border-0 text-[10px] shrink-0 h-4 px-1.5">
                  OVERDUE
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-0 text-[10px] shrink-0 h-4 px-1.5">
                  {item.daysUntil === 0 ? 'TODAY' : `${item.daysUntil}d`}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Progress value={item.progress} className="h-1.5 flex-1" />
              <span className="text-[10px] text-muted-foreground w-7 text-right tabular-nums">
                {item.progress}%
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground mt-0.5 block">
              Due {format(parseISO(item.endDate), 'MMM d')}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  subValue,
  progress,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subValue?: string;
  progress?: number;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 flex-1 min-w-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium truncate">
          {label}
        </span>
      </div>
      <div className="text-sm font-semibold text-foreground tabular-nums">{value}</div>
      {subValue && (
        <div className="text-[11px] text-muted-foreground mt-0.5">{subValue}</div>
      )}
      {progress != null && (
        <Progress value={progress} className="h-1 mt-1.5" />
      )}
    </div>
  );
}

export function ProjectQuickOverview({ projectId, stats }: ProjectQuickOverviewProps) {
  const navigate = useNavigate();

  // Bug 5 fix: Build KPI tiles array and set dynamic grid cols
  const kpiTiles = useMemo(() => {
    const tiles: Array<{
      icon: React.ElementType;
      label: string;
      value: string;
      subValue?: string;
      progress?: number;
    }> = [];

    if (stats.budgetTotal > 0) {
      tiles.push({
        icon: DollarSign,
        label: 'Billed',
        value: formatCurrency(stats.budgetUsed),
        subValue: `of ${formatCurrency(stats.budgetTotal)}`,
        progress: stats.budgetPercent,
      });
    }

    if (stats.outstandingBilling > 0) {
      tiles.push({
        icon: TrendingUp,
        label: 'Outstanding',
        value: formatCurrency(stats.outstandingBilling),
      });
    }

    // Bug 6 fix: Show schedule tile when schedule exists, even at 0%
    if (stats.hasSchedule) {
      tiles.push({
        icon: CalendarCheck,
        label: 'Schedule',
        value: `${stats.schedulePercent}%`,
        subValue:
          stats.scheduleDelta > 0
            ? `${stats.scheduleDelta}% ahead`
            : stats.scheduleDelta < 0
            ? `${Math.abs(stats.scheduleDelta)}% behind`
            : 'On track',
        progress: stats.schedulePercent,
      });
    }

    return tiles;
  }, [stats]);

  if (stats.loading) {
    return (
      <div className="space-y-3 pt-3 pb-1">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-3/4 rounded-lg" />
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
      </div>
    );
  }

  const hasActions = stats.actionItems.length > 0;
  const hasCritical = stats.criticalScheduleItems.length > 0;
  // Bug 7 fix: Also consider scheduleDelta when determining "all clear"
  const isBehindSchedule = stats.hasSchedule && stats.scheduleDelta < -5;

  const navigateToTab = (tab?: string) => {
    const base = `/project/${projectId}`;
    navigate(tab ? `${base}/${tab}` : `${base}/overview`);
  };

  // Bug 5 fix: Dynamic grid columns
  const gridCols =
    kpiTiles.length === 1
      ? 'grid-cols-1'
      : kpiTiles.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-3';

  return (
    <div className="space-y-3 pt-3 pb-1">
      {/* Section 1: Action Alerts */}
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
      ) : !hasCritical && !isBehindSchedule ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          All clear — no items need attention
        </div>
      ) : null}

      {/* Section 2: Critical Schedule Items */}
      <CriticalScheduleSection
        items={stats.criticalScheduleItems}
        totalCount={stats.totalCriticalCount}
        onNavigate={(tab) => navigateToTab(tab)}
      />

      {/* Section 3: Financial KPI Tiles */}
      {kpiTiles.length > 0 && (
        <div className={cn('grid gap-2', gridCols)}>
          {kpiTiles.map((tile) => (
            <KpiTile key={tile.label} {...tile} />
          ))}
        </div>
      )}

      {/* Section 4: CTA */}
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
