import { useNavigate } from 'react-router-dom';
import { ArrowRight, DollarSign, CalendarCheck, MessageSquareWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ProjectQuickStats, PhaseItem } from '@/hooks/useProjectQuickStats';

interface ProjectQuickOverviewProps {
  projectId: string;
  stats: ProjectQuickStats;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

function KPITile({
  label,
  value,
  subtitle,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-4 w-4', colorClass)} />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </div>
      <span className={cn('text-2xl sm:text-3xl font-bold', colorClass)}>{value}</span>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </div>
  );
}

function PhaseBar({ phase }: { phase: PhaseItem }) {
  const isDone = phase.progress >= 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-28 sm:w-36 truncate">{phase.title}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(phase.progress, 100)}%`,
            backgroundColor: phase.color,
          }}
        />
      </div>
      {isDone ? (
        <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">
          Done
        </Badge>
      ) : (
        <span className="text-xs font-medium text-muted-foreground w-10 text-right shrink-0">
          {phase.progress}%
        </span>
      )}
    </div>
  );
}

export function ProjectQuickOverview({ projectId, stats }: ProjectQuickOverviewProps) {
  const navigate = useNavigate();

  if (stats.loading) {
    return (
      <div className="space-y-4 pt-3 pb-1">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-5 w-full rounded" />
          ))}
        </div>
      </div>
    );
  }

  const deltaLabel =
    stats.scheduleDelta >= 0
      ? `${stats.scheduleDelta} days ahead`
      : `${Math.abs(stats.scheduleDelta)} days behind`;

  return (
    <div className="space-y-4 pt-3 pb-1">
      {/* KPI Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KPITile
          label="Budget Used"
          value={`${stats.budgetPercent}%`}
          subtitle={`${formatCurrency(stats.budgetUsed)} of ${formatCurrency(stats.budgetTotal)}`}
          icon={DollarSign}
          colorClass="text-amber-600 dark:text-amber-400"
        />
        <KPITile
          label="Schedule"
          value={`${stats.schedulePercent}%`}
          subtitle={deltaLabel}
          icon={CalendarCheck}
          colorClass="text-emerald-600 dark:text-emerald-400"
        />
        <KPITile
          label="Open RFIs"
          value={String(stats.openRFIs)}
          subtitle={stats.urgentRFIs > 0 ? `${stats.urgentRFIs} need response today` : 'None urgent'}
          icon={MessageSquareWarning}
          colorClass="text-indigo-600 dark:text-indigo-400"
        />
      </div>

      {/* Phase Progress */}
      {stats.phases.length > 0 && (
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Phase Progress
          </span>
          <div className="space-y-2">
            {stats.phases.map((phase) => (
              <PhaseBar key={phase.id} phase={phase} />
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="flex justify-end pt-1">
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
