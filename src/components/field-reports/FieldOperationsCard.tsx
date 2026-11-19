import { AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Clock3, FileText, Loader2, Package } from 'lucide-react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Button } from '@/components/ui/button';
import { C, type PillType } from '@/components/shared/KpiCard';
import type { AttentionWarning } from '@/components/project/OverviewAttentionStrip';
import {
  fieldOperationsAttention,
  type FieldOperationsModel,
  type FieldPulseStatus,
} from '@/lib/fieldOperations';
import { cn } from '@/lib/utils';

const PULSE_LABEL: Record<FieldPulseStatus, string> = {
  blocker: 'Blocker reported',
  pending: 'Awaiting review',
  released: 'Released',
  draft: 'Draft',
  none: 'No report',
};

const PULSE_CLASS: Record<FieldPulseStatus, string> = {
  blocker: 'border-destructive/30 bg-destructive/10 text-destructive',
  pending: 'border-state-open-bg bg-state-open-bg text-state-open-foreground',
  released: 'border-state-approved-bg bg-state-approved-bg text-state-approved-foreground',
  draft: 'border-border bg-muted text-muted-foreground',
  none: 'border-border/60 bg-muted/30 text-muted-foreground',
};

export function fieldOperationsWarnings(model: FieldOperationsModel | null): AttentionWarning[] {
  if (!model) return [];
  return fieldOperationsAttention(model).map((warning) => ({
    color: warning.tone === 'red' ? C.red : C.yellow,
    icon: warning.tone === 'red' ? '⚠' : '📋',
    title: warning.title,
    sub: warning.sub,
    value: warning.value,
    pill: warning.pill,
    pillType: (warning.tone === 'red' ? 'pr' : 'pw') as PillType,
    tab: warning.tab,
  }));
}

interface Props {
  model: FieldOperationsModel | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onNavigate: (tab: string) => void;
}

export function FieldOperationsCard({ model, isLoading, isError, onRetry, onNavigate }: Props) {
  if (isLoading) {
    return (
      <section aria-label="Loading Field Operations" className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading Field Operations…</div>
      </section>
    );
  }

  if (isError || !model) {
    return (
      <section className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-muted-foreground" /><h2 className="font-heading text-xl font-semibold">Field Operations</h2></div>
          <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">Field Report activity could not be loaded.</p>
      </section>
    );
  }

  const latestTime = model.latestUpdate
    ? model.latestUpdate.released_at || model.latestUpdate.confirmed_at || model.latestUpdate.updated_at || model.latestUpdate.created_at
    : null;

  return (
    <section aria-labelledby="field-operations-heading" className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="flex flex-col gap-3 border-b border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-type-sov/10 text-type-sov"><ClipboardList size={18} /></span>
          <div className="min-w-0">
            <h2 id="field-operations-heading" className="font-heading text-xl font-semibold leading-none">Field Operations</h2>
            <p className="mt-1 text-[11px] font-medium text-muted-foreground">Field Reports · five-day pulse</p>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-5 gap-1 sm:w-[330px] sm:shrink-0" aria-label="Five-day Field Report pulse">
          {model.pulse.map((day) => {
            const date = new Date(`${day.date}T12:00:00`);
            const label = `${format(date, 'EEEE, MMMM d')}: ${PULSE_LABEL[day.status]}`;
            return (
              <button
                key={day.date}
                type="button"
                disabled={!day.reportId}
                onClick={() => day.reportId && onNavigate(`daily-reports?report=${day.reportId}`)}
                aria-label={label}
                title={label}
                className={cn('flex min-w-0 flex-col items-center rounded-lg border px-1 py-1.5 transition-colors disabled:cursor-default disabled:opacity-70', PULSE_CLASS[day.status])}
              >
                <span className="text-[9px] font-bold uppercase">{format(date, 'EEE')}</span>
                <span className="font-mono text-xs font-semibold leading-tight">{format(date, 'd')}</span>
                <span className={cn('mt-0.5 h-1.5 w-1.5 rounded-full bg-current', day.status === 'none' && 'opacity-30')} />
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2">
        <div className="min-w-0 p-4">
          <div className="flex items-start gap-2.5">
            <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', model.todayBlockers.length ? 'bg-destructive/10 text-destructive' : model.ownDraft ? 'bg-state-open-bg text-state-open-foreground' : 'bg-state-approved-bg text-state-approved-foreground')}>
              {model.todayBlockers.length ? <AlertTriangle size={14} /> : model.ownDraft ? <CalendarDays size={14} /> : <CheckCircle2 size={14} />}
            </span>
            <div className="min-w-0">
              <h3 className="break-words text-sm font-bold">{model.headline}</h3>
              <p className="mt-1 break-words text-xs leading-relaxed text-muted-foreground">{model.statusDetail}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><FileText size={13} className="shrink-0" /><span className="font-mono font-semibold text-foreground">{model.todayItems.length}</span> updates</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 size={13} className="shrink-0" /><span className="font-mono font-semibold text-foreground">{model.todayHours === null ? '—' : `${model.todayHours} h`}</span>{model.todayHours === null ? 'not reported' : 'reported'}</span>
            <span className="inline-flex items-center gap-1.5"><AlertTriangle size={13} className="shrink-0" /><span className="font-mono font-semibold text-foreground">{model.todayBlockers.length}</span> blockers</span>
            <span className="inline-flex items-center gap-1.5"><Package size={13} className="shrink-0" /><span className="font-mono font-semibold text-foreground">{model.todayMaterials.length}</span> materials</span>
          </div>

          <Button size="sm" className="mt-4" onClick={() => onNavigate(model.actionTab)}>
            {model.actionLabel}<ArrowRight />
          </Button>
        </div>

        <button
          type="button"
          disabled={!model.latestUpdateReportId}
          onClick={() => model.latestUpdateReportId && onNavigate(`daily-reports?report=${model.latestUpdateReportId}`)}
          className="group min-w-0 border-t border-border/70 bg-accent/30 p-4 text-left disabled:cursor-default md:border-l md:border-t-0"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Latest field update</p>
            {model.latestUpdateReportId && <ArrowRight size={14} className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />}
          </div>
          {model.latestUpdate ? (
            <>
              <p className="mt-2 line-clamp-3 break-words text-sm font-medium leading-relaxed">{model.latestUpdate.description}</p>
              <p className="mt-2 break-words text-xs text-muted-foreground">
                {model.latestUpdateCompany}
                {latestTime && ` · ${formatDistanceToNowStrict(new Date(latestTime), { addSuffix: true })}`}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No field updates available yet.</p>
          )}
        </button>
      </div>
    </section>
  );
}
