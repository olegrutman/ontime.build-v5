import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertTriangle, ArrowRight, ChevronDown, ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useCardCollapse } from '@/hooks/useCardCollapse';
import type { FieldOperationsRole, FieldPulseStatus } from '@/lib/fieldOperations';
import { rankPortfolioRows, useFieldOperationsPortfolio } from '@/hooks/useFieldOperationsPortfolio';

const PULSE_LABEL: Record<FieldPulseStatus, string> = {
  blocker: 'Blocker reported', pending: 'Awaiting review', released: 'Released', draft: 'Draft', none: 'No report',
};
const PULSE_CLASS: Record<FieldPulseStatus, string> = {
  blocker: 'border-destructive/30 bg-destructive/10 text-destructive',
  pending: 'border-state-open-bg bg-state-open-bg text-state-open-foreground',
  released: 'border-state-approved-bg bg-state-approved-bg text-state-approved-foreground',
  draft: 'border-border bg-muted text-muted-foreground',
  none: 'border-border/60 bg-muted/30 text-muted-foreground',
};

interface Props { projects: { id: string; name: string; status: string }[]; role: FieldOperationsRole; }

export function DashboardFieldOperations({ projects, role }: Props) {
  const navigate = useNavigate();
  const { userOrgRoles } = useAuth();
  const currentOrgId = userOrgRoles[0]?.organization?.id;
  const { collapsed, toggle } = useCardCollapse(`field-ops-dashboard-${currentOrgId || role}`);
  const [expanded, setExpanded] = useState(false);
  const active = projects.filter((p) => !['archived', 'completed'].includes(p.status));
  const { rows, isLoading, isError, refetch } = useFieldOperationsPortfolio(active, role);
  if (active.length === 0) return null;

  const ranked = rankPortfolioRows(rows);
  const visible = expanded ? ranked : ranked.slice(0, 4);
  const blockers = rows.reduce((n, r) => n + r.model.todayBlockers.length, 0);
  const reviews = rows.reduce((n, r) => n + r.model.pendingReviewReports.length, 0);
  const reportedToday = rows.filter((r) => r.model.todayReports.length > 0).length;
  const top = ranked[0];
  const go = (projectId: string, tab: string) => navigate(`/project/${projectId}/${tab}`);

  return (
    <section aria-labelledby="dash-field-ops" className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className={cn('flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4', !collapsed && 'border-b border-border/70')}>
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-type-sov/10 text-type-sov"><ClipboardList size={18} /></span>
          <div className="min-w-0">
            <h2 id="dash-field-ops" className="font-heading text-xl font-semibold leading-none">Field Operations</h2>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">Field Reports across your projects · five-day pulse</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center justify-between gap-3 sm:justify-end">
          {!isLoading && !isError && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span><span className="font-mono font-semibold text-foreground">{reportedToday}/{active.length}</span> reported today</span>
              <span><span className={cn('font-mono font-semibold', reviews ? 'text-state-open-foreground' : 'text-foreground')}>{reviews}</span> awaiting your review</span>
              <span><span className={cn('font-mono font-semibold', blockers ? 'text-destructive' : 'text-foreground')}>{blockers}</span> blockers</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            aria-label={collapsed ? 'Expand Field Operations project list' : 'Collapse Field Operations project list'}
            aria-expanded={!collapsed}
            aria-controls={collapsed ? undefined : 'dash-field-ops-body'}
            onClick={toggle}
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform duration-200', collapsed && 'rotate-180')} />
          </Button>
        </div>
      </div>

      {collapsed ? (
        <button type="button" onClick={toggle} className="w-full px-4 py-2.5 text-left" aria-label="Show Field Operations project list">
          {top ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              {top.model.todayBlockers.length > 0 && <AlertTriangle size={14} className="shrink-0 text-destructive" />}
              <span className="break-words text-sm font-bold">{top.projectName}</span>
              <span className="break-words text-muted-foreground">{top.model.headline}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Field Report activity is hidden.</span>
          )}
        </button>
      ) : isLoading ? (
        <div id="dash-field-ops-body" className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading Field Operations…</div>
      ) : isError ? (
        <div id="dash-field-ops-body" className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm text-muted-foreground">
          Field Report activity could not be loaded.
          <Button variant="outline" size="sm" onClick={() => { void refetch(); }}>Try again</Button>
        </div>
      ) : (
        <div id="dash-field-ops-body">
          <ul className="divide-y divide-border/70">
            {visible.map(({ projectId, projectName, model }) => (
              <li key={projectId} className="flex flex-col gap-2 p-3 sm:p-4 lg:flex-row lg:items-center lg:gap-4">
                <button type="button" onClick={() => go(projectId, model.actionTab)} className="group min-w-0 flex-1 text-left">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {model.todayBlockers.length > 0 && <AlertTriangle size={14} className="shrink-0 text-destructive" />}
                    <span className="break-words text-sm font-bold">{projectName}</span>
                    <ArrowRight size={13} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">{model.headline} · {model.actionLabel}</p>
                </button>
                <div className="grid w-full min-w-0 grid-cols-5 gap-1 lg:w-[300px] lg:shrink-0" aria-label={`${projectName} five-day pulse`}>
                  {model.pulse.map((day) => {
                    const date = new Date(`${day.date}T12:00:00`);
                    const label = `${projectName}, ${format(date, 'EEEE, MMMM d')}: ${PULSE_LABEL[day.status]}`;
                    return (
                      <button key={day.date} type="button" disabled={!day.reportId} aria-label={label} title={label}
                        onClick={() => day.reportId && go(projectId, `daily-reports?report=${day.reportId}`)}
                        className={cn('flex min-w-0 flex-col items-center rounded-lg border px-1 py-1 disabled:cursor-default disabled:opacity-70', PULSE_CLASS[day.status])}>
                        <span className="text-[9px] font-bold uppercase">{format(date, 'EEE')}</span>
                        <span className="font-mono text-xs font-semibold leading-tight">{format(date, 'd')}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
          {ranked.length > 4 && (
            <div className="border-t border-border/70 px-4 py-2">
              <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
                {expanded ? 'Show fewer projects' : `Show all ${ranked.length} projects`}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
