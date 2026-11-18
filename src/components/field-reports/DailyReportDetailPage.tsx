import { format } from 'date-fns';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Inbox,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DraftEditor, ReportBlock } from './FieldReportsCard';
import { FieldReportPhotoGallery, type FieldReportPhoto } from './FieldReportPhotoGallery';

interface Props {
  report: any;
  items: any[];
  photos: FieldReportPhoto[];
  crewName: string;
  reviewerName: string;
  isCrewDraft: boolean;
  reviewer: boolean;
  privateParty: boolean;
  status: string;
  onChange: () => void;
  onBack: () => void;
}

export function DailyReportDetailPage({ report, items, photos, crewName, reviewerName, isCrewDraft, reviewer, privateParty, status, onChange, onBack }: Props) {
  const released = items.filter(item => ['released', 'converted'].includes(item.status)).length;
  const pending = items.filter(item => item.status === 'crew_confirmed').length;
  const hours = items.filter(item => item.kind === 'hours').reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const blockers = items.filter(item => item.kind === 'blocker').length;
  const safeReport = privateParty ? report : { ...report, raw_text: null, audio_path: null, transcript: null };
  const hasSource = privateParty && (report.raw_text || report.audio_path);
  const itemProps = { report: safeReport, photos: [], reviewer, onChange, reviewDesk: true };
  const columns = [
    {
      id: 'pending',
      title: 'Awaiting review',
      description: 'Needs a release or hold decision',
      items: items.filter(item => item.status === 'crew_confirmed'),
      icon: Inbox,
    },
    {
      id: 'released',
      title: 'Released',
      description: 'Visible to the project',
      items: items.filter(item => item.status === 'released'),
      icon: CheckCircle2,
    },
    {
      id: 'closed',
      title: 'Held or ordered',
      description: 'Held back or turned into an order',
      items: items.filter(item => ['held', 'converted', 'reviewed'].includes(item.status)),
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="min-w-0 space-y-5 pb-36 lg:pb-8" aria-label="Field Report review board">
      <div>
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft />All Field Reports</Button>
      </div>

      <header className="rounded-2xl bg-command p-4 text-command-foreground shadow-sm sm:p-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wide text-command-foreground/60">
              {format(new Date(report.report_date + 'T12:00:00'), 'EEEE, MMM d, yyyy')} · FR-{report.id.slice(0, 8).toUpperCase()}
            </p>
            <h1 className="mt-1 font-heading text-3xl font-semibold">Field Report</h1>
            <p className="mt-2 break-words text-sm text-command-foreground/70">
              <span className="font-medium">{crewName}</span><span className="mx-2 opacity-50">→</span>{reviewerName}
            </p>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-background/10 px-2.5 py-1 text-[11px] font-semibold text-command-foreground">
            {['Released', 'Reviewed'].includes(status) && <CheckCircle2 size={13} />}{status}
          </span>
        </div>
        <div className="mt-4 border-t border-command-foreground/10 pt-1">
          <Stats items={items} photos={photos} hours={hours} blockers={blockers} pending={pending} />
        </div>
      </header>

      {isCrewDraft ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5">
            <DraftEditor key={report.id} report={report} items={items} photos={photos} onChange={onChange} />
          </div>
          <DraftSummary crewName={crewName} reviewerName={reviewerName} items={items} />
        </div>
      ) : (
        <>
          <div className="grid items-start gap-3 xl:grid-cols-3 xl:items-stretch">
            {columns.map(column => (
              <section key={column.id} className="min-w-0 rounded-2xl border border-border/60 bg-muted/30 p-3 xl:flex xl:h-[50vh] xl:min-h-[440px] xl:max-h-[600px] xl:flex-col" aria-label={column.title}>
                <div className="mb-3 flex shrink-0 items-start justify-between gap-3 px-1 pt-1">
                  <div className="flex min-w-0 gap-2">
                    <column.icon size={17} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <div>
                      <h2 className="font-heading text-xl font-semibold">{column.title}</h2>
                      <p className="text-[11px] text-muted-foreground">{column.description}</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-background px-2 py-1 font-mono text-xs font-semibold shadow-sm">{column.items.length}</span>
                </div>
                <div className="min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1 xl:pb-1">
                  <ReportBlock title={column.title} {...itemProps} items={column.items} itemStyle="card" />
                  {!column.items.length && <p className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground xl:h-[calc(100%-4px)]">No items here.</p>}
                </div>
              </section>
            ))}
          </div>

          <div className={hasSource ? 'grid items-stretch gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]' : 'grid items-stretch gap-4 lg:grid-cols-2'}>
            {hasSource && (
              <div className="h-full rounded-2xl border border-border/60 bg-card p-4">
                <ReportBlock title="Original update" report={safeReport} items={[]} photos={[]} />
              </div>
            )}
            <div className="h-full rounded-2xl border border-border/60 bg-card p-4">
              <PhotoSection photos={photos} />
            </div>
            <div className="h-full rounded-2xl border border-border/60 bg-card p-4">
              <ReviewSummary released={released} total={items.length} privateParty={privateParty} crewName={crewName} reviewerName={reviewerName} />
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Stats({ items, photos, hours, blockers, pending }: {
  items: any[];
  photos: FieldReportPhoto[];
  hours: number;
  blockers: number;
  pending: number;
}) {
  const stats = [
    { icon: ClipboardList, value: items.length, label: 'field items' },
    { icon: Clock3, value: `${hours} h`, label: 'reported' },
    { icon: Camera, value: photos.length, label: 'photos' },
    { icon: pending ? Inbox : TriangleAlert, value: pending || blockers, label: pending ? 'awaiting review' : blockers === 1 ? 'blocking problem' : 'blocking problems' },
  ];
  return (
    <div className="grid grid-cols-2 divide-x divide-command-foreground/10 sm:grid-cols-4">
      {stats.map(stat => (
        <div key={stat.label} className="flex min-w-0 items-center gap-2 px-3 py-3 first:pl-0">
          <stat.icon size={15} className="shrink-0 text-command-foreground/60" />
          <div className="min-w-0">
            <span className="font-mono text-sm font-semibold">{stat.value}</span>
            <span className="ml-1.5 text-[11px] text-command-foreground/60">{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PhotoSection({ photos }: { photos: FieldReportPhoto[] }) {
  return (
    <section className="min-w-0 space-y-3">
      <h2 className="font-heading text-xl font-semibold">Field photos</h2>
      {photos.length ? <FieldReportPhotoGallery photos={photos} title="Report photos" /> : <p className="text-xs text-muted-foreground">No photos attached.</p>}
    </section>
  );
}

function ReviewSummary({ released, total, privateParty, crewName, reviewerName }: {
  released: number;
  total: number;
  privateParty: boolean;
  crewName: string;
  reviewerName: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Released to project</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{released}<span className="text-sm text-muted-foreground"> / {total}</span></p>
        </div>
        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
      </div>
      <dl className="space-y-2 border-t border-border pt-3 text-xs">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Reported by</dt><dd className="break-words text-right font-medium">{crewName}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Reviewed by</dt><dd className="break-words text-right font-medium">{reviewerName}</dd></div>
      </dl>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {privateParty ? 'Unreleased items stay private to the reporting and reviewing companies.' : 'Only released field updates are visible to your company.'}
      </p>
    </section>
  );
}

function DraftSummary({ crewName, reviewerName, items }: { crewName: string; reviewerName: string; items: any[] }) {
  return (
    <aside className="h-fit rounded-2xl border border-border/60 bg-accent p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ready when you are</p>
      <p className="mt-2 font-mono text-3xl font-semibold">{items.length}</p>
      <p className="text-xs text-muted-foreground">field items added</p>
      <dl className="mt-4 space-y-3 border-t border-border pt-4 text-xs">
        <div><dt className="text-muted-foreground">Reporting company</dt><dd className="mt-1 break-words font-medium">{crewName}</dd></div>
        <div><dt className="text-muted-foreground">Reviewing company</dt><dd className="mt-1 break-words font-medium">{reviewerName}</dd></div>
      </dl>
      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck size={15} className="shrink-0" />Nothing is shared with the project until the reviewer releases it.</p>
    </aside>
  );
}
