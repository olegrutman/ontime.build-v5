import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Columns3,
  FileText,
  Focus,
  Inbox,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DraftEditor, KIND_LABEL, ReportBlock } from './FieldReportsCard';
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

type Layout = 'brief' | 'board' | 'focus';

const layouts: Array<{ id: Layout; label: string; description: string; icon: typeof FileText }> = [
  { id: 'brief', label: 'Daily brief', description: 'A clean report document', icon: FileText },
  { id: 'board', label: 'Review board', description: 'Items grouped by decision', icon: Columns3 },
  { id: 'focus', label: 'Focus review', description: 'One item at a time', icon: Focus },
];

export function DailyReportDetailPage(props: Props) {
  const [layout, setLayout] = useState<Layout>('brief');
  const [category, setCategory] = useState('all');
  const { report, items, photos, crewName, reviewerName, isCrewDraft, reviewer, privateParty, status, onChange, onBack } = props;
  const released = items.filter(item => ['released', 'converted'].includes(item.status)).length;
  const pending = items.filter(item => item.status === 'crew_confirmed').length;
  const hours = items.filter(item => item.kind === 'hours').reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const blockers = items.filter(item => item.kind === 'blocker').length;
  const safeReport = privateParty ? report : { ...report, raw_text: null, audio_path: null, transcript: null };
  const visibleItems = category === 'all' ? items : items.filter(item => item.kind === category);
  const itemProps = { report: safeReport, photos: [], reviewer, onChange, reviewDesk: true };

  return (
    <section className="min-w-0 space-y-5 pb-36 lg:pb-8" aria-label="Field Report">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft />All Field Reports</Button>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Compare live layouts</p>
        </div>
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-card p-2 shadow-sm" role="tablist" aria-label="Field Report layouts">
          {layouts.map((option, index) => (
            <Button
              key={option.id}
              role="tab"
              aria-selected={layout === option.id}
              variant={layout === option.id ? 'default' : 'ghost'}
              onClick={() => setLayout(option.id)}
              className="h-auto min-h-14 justify-start gap-2 px-2 py-2 text-left sm:px-3"
            >
              <option.icon className="hidden h-4 w-4 shrink-0 sm:block" />
              <span className="min-w-0">
                <span className="block text-[10px] font-semibold uppercase opacity-70">Design {index + 1}</span>
                <span className="block truncate text-xs font-semibold sm:text-sm">{option.label}</span>
                <span className="hidden text-[11px] font-normal opacity-70 md:block">{option.description}</span>
              </span>
            </Button>
          ))}
        </div>
      </div>

      {layout === 'brief' && (
        <BriefLayout
          {...props}
          safeReport={safeReport}
          visibleItems={visibleItems}
          category={category}
          setCategory={setCategory}
          hours={hours}
          blockers={blockers}
          pending={pending}
          released={released}
          itemProps={itemProps}
        />
      )}
      {layout === 'board' && (
        <BoardLayout
          {...props}
          safeReport={safeReport}
          hours={hours}
          blockers={blockers}
          pending={pending}
          released={released}
          itemProps={itemProps}
        />
      )}
      {layout === 'focus' && (
        <FocusLayout
          {...props}
          safeReport={safeReport}
          hours={hours}
          blockers={blockers}
          pending={pending}
          released={released}
          itemProps={itemProps}
        />
      )}
    </section>
  );
}

function ReportStatus({ status, dark = false }: { status: string; dark?: boolean }) {
  return (
    <span className={cn(
      'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
      dark ? 'bg-background/10 text-command-foreground' : ['Released', 'Reviewed'].includes(status)
        ? 'bg-state-approved-bg text-state-approved-foreground'
        : status === 'Draft' ? 'bg-muted text-muted-foreground' : 'bg-state-open-bg text-state-open-foreground',
    )}>
      {['Released', 'Reviewed'].includes(status) && <CheckCircle2 size={13} />}
      {status}
    </span>
  );
}

function ReportIdentity({ report, crewName, reviewerName, status, dark = false, compact = false }: {
  report: any;
  crewName: string;
  reviewerName: string;
  status: string;
  dark?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={cn('font-mono text-[11px] uppercase tracking-wide', dark ? 'text-command-foreground/60' : 'text-muted-foreground')}>
          {format(new Date(report.report_date + 'T12:00:00'), 'EEEE, MMM d, yyyy')} · FR-{report.id.slice(0, 8).toUpperCase()}
        </p>
        <h1 className={cn('mt-1 font-heading font-semibold', compact ? 'text-3xl' : 'text-4xl sm:text-5xl')}>Field Report</h1>
        <p className={cn('mt-2 break-words text-sm', dark ? 'text-command-foreground/70' : 'text-muted-foreground')}>
          <span className="font-medium text-inherit">{crewName}</span>
          <span className="mx-2 opacity-50">→</span>{reviewerName}
        </p>
      </div>
      <ReportStatus status={status} dark={dark} />
    </div>
  );
}

function Stats({ items, photos, hours, blockers, pending, dark = false }: {
  items: any[];
  photos: FieldReportPhoto[];
  hours: number;
  blockers: number;
  pending: number;
  dark?: boolean;
}) {
  const stats = [
    { icon: ClipboardList, value: items.length, label: 'field items' },
    { icon: Clock3, value: `${hours} h`, label: 'reported' },
    { icon: Camera, value: photos.length, label: 'photos' },
    { icon: pending ? Inbox : TriangleAlert, value: pending || blockers, label: pending ? 'awaiting review' : blockers === 1 ? 'blocking problem' : 'blocking problems' },
  ];
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-4', dark ? 'divide-x divide-command-foreground/10' : 'divide-x divide-border')}>
      {stats.map(stat => (
        <div key={stat.label} className="flex min-w-0 items-center gap-2 px-3 py-3 first:pl-0">
          <stat.icon size={15} className={cn('shrink-0', dark ? 'text-command-foreground/60' : stat.label.includes('blocking') && blockers ? 'text-destructive' : 'text-muted-foreground')} />
          <div className="min-w-0">
            <span className="font-mono text-sm font-semibold">{stat.value}</span>
            <span className={cn('ml-1.5 text-[11px]', dark ? 'text-command-foreground/60' : 'text-muted-foreground')}>{stat.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SourceUpdate({ report }: { report: any }) {
  if (!report.raw_text && !report.audio_path) return null;
  return <ReportBlock title="Original update" report={report} items={[]} photos={[]} />;
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

function CategoryFilters({ category, setCategory }: { category: string; setCategory: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1" aria-label="Filter field items">
      {[['all', 'All items'], ...Object.entries(KIND_LABEL)].map(([value, title]) => (
        <Button
          key={value}
          size="sm"
          variant="ghost"
          aria-pressed={category === value}
          onClick={() => setCategory(value)}
          className={cn('text-xs', category === value && 'bg-command text-command-foreground hover:bg-command hover:text-command-foreground')}
        >{title}</Button>
      ))}
    </div>
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

interface LayoutProps extends Props {
  safeReport: any;
  hours: number;
  blockers: number;
  pending: number;
  released: number;
  itemProps: { report: any; photos: FieldReportPhoto[]; reviewer: boolean; onChange: () => void; reviewDesk: boolean };
}

function BriefLayout({ report, items, photos, crewName, reviewerName, isCrewDraft, privateParty, status, safeReport, visibleItems = [], category = 'all', setCategory = () => {}, hours, blockers, pending, released, itemProps }: LayoutProps & {
  visibleItems?: any[];
  category?: string;
  setCategory?: (value: string) => void;
}) {
  return (
    <>
      <header className="border-b border-border pb-5"><ReportIdentity report={report} crewName={crewName} reviewerName={reviewerName} status={status} /></header>
      <div className="border-b border-border"><Stats items={items} photos={photos} hours={hours} blockers={blockers} pending={pending} /></div>
      {isCrewDraft ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5"><DraftEditor key={report.id} report={report} items={items} photos={photos} onChange={itemProps.onChange} /></div>
          <DraftSummary crewName={crewName} reviewerName={reviewerName} items={items} />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-2xl font-semibold">Today’s field updates</h2>
              <span className="font-mono text-xs text-muted-foreground">{visibleItems.length} shown</span>
            </div>
            <div className="mt-3"><CategoryFilters category={category} setCategory={setCategory} /></div>
            <div className="mt-2 border-t border-border">
              <ReportBlock title="Field items" {...itemProps} items={visibleItems} itemStyle="document" />
              {!visibleItems.length && <p className="py-8 text-sm text-muted-foreground">No field items in this category.</p>}
            </div>
          </section>
          <aside className="min-w-0 space-y-6 xl:border-l xl:border-border xl:pl-6">
            {privateParty && <SourceUpdate report={safeReport} />}
            <PhotoSection photos={photos} />
            <div className="border-t border-border pt-4"><ReviewSummary released={released} total={items.length} privateParty={privateParty} crewName={crewName} reviewerName={reviewerName} /></div>
          </aside>
        </div>
      )}
    </>
  );
}

function BoardLayout({ report, items, photos, crewName, reviewerName, isCrewDraft, privateParty, status, safeReport, hours, blockers, pending, released, itemProps }: LayoutProps) {
  const columns = [
    { id: 'pending', title: 'Awaiting review', description: 'Needs a release or hold decision', items: items.filter(item => item.status === 'crew_confirmed'), icon: Inbox },
    { id: 'released', title: 'Released', description: 'Visible to the project', items: items.filter(item => item.status === 'released'), icon: CheckCircle2 },
    { id: 'closed', title: 'Held or ordered', description: 'Held back or turned into an order', items: items.filter(item => ['held', 'converted', 'reviewed'].includes(item.status)), icon: ShieldCheck },
  ];
  return (
    <>
      <header className="rounded-2xl bg-command p-4 text-command-foreground shadow-sm sm:p-5">
        <ReportIdentity report={report} crewName={crewName} reviewerName={reviewerName} status={status} dark compact />
        <div className="mt-4 border-t border-command-foreground/10 pt-1"><Stats items={items} photos={photos} hours={hours} blockers={blockers} pending={pending} dark /></div>
      </header>
      {isCrewDraft ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-5"><DraftEditor key={report.id} report={report} items={items} photos={photos} onChange={itemProps.onChange} /></div>
          <DraftSummary crewName={crewName} reviewerName={reviewerName} items={items} />
        </div>
      ) : (
        <>
          <div className="grid items-start gap-3 2xl:grid-cols-3">
            {columns.map(column => (
              <section key={column.id} className="min-w-0 rounded-2xl border border-border/60 bg-muted/30 p-3">
                <div className="mb-3 flex items-start justify-between gap-3 px-1 pt-1">
                  <div className="flex min-w-0 gap-2"><column.icon size={17} className="mt-0.5 shrink-0 text-muted-foreground" /><div><h2 className="font-heading text-xl font-semibold">{column.title}</h2><p className="text-[11px] text-muted-foreground">{column.description}</p></div></div>
                  <span className="rounded-full bg-background px-2 py-1 font-mono text-xs font-semibold shadow-sm">{column.items.length}</span>
                </div>
                <ReportBlock title={column.title} {...itemProps} items={column.items} itemStyle="card" />
                {!column.items.length && <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">No items here.</p>}
              </section>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
            {privateParty && <div className="rounded-2xl border border-border/60 bg-card p-4"><SourceUpdate report={safeReport} /></div>}
            <div className="rounded-2xl border border-border/60 bg-card p-4"><PhotoSection photos={photos} /></div>
            <div className="rounded-2xl border border-border/60 bg-card p-4"><ReviewSummary released={released} total={items.length} privateParty={privateParty} crewName={crewName} reviewerName={reviewerName} /></div>
          </div>
        </>
      )}
    </>
  );
}

function FocusLayout({ report, items, photos, crewName, reviewerName, isCrewDraft, privateParty, status, safeReport, pending, released, itemProps }: LayoutProps) {
  const orderedItems = useMemo(() => [...items].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at))), [items]);
  const firstItem = orderedItems.find(item => item.status === 'crew_confirmed') || orderedItems[0];
  const [selectedId, setSelectedId] = useState<string | null>(firstItem?.id || null);
  useEffect(() => {
    if (!orderedItems.some(item => item.id === selectedId)) setSelectedId(firstItem?.id || null);
  }, [orderedItems, selectedId, firstItem?.id]);
  const index = Math.max(0, orderedItems.findIndex(item => item.id === selectedId));
  const selected = orderedItems[index];
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <ReportIdentity report={report} crewName={crewName} reviewerName={reviewerName} status={status} compact />
      </header>
      {isCrewDraft ? (
        <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6"><DraftEditor key={report.id} report={report} items={items} photos={photos} onChange={itemProps.onChange} /></div>
      ) : selected ? (
        <>
          <div className="grid items-start gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="min-w-0 lg:sticky lg:top-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="font-heading text-xl font-semibold">Report queue</h2>
                <span className="font-mono text-xs text-muted-foreground">{pending} pending</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 lg:max-h-[560px] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden" aria-label="Choose a field item">
                {orderedItems.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={item.id === selected.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'w-[190px] shrink-0 rounded-xl border p-3 text-left transition-colors lg:w-full lg:shrink',
                      item.id === selected.id ? 'border-primary bg-accent shadow-sm' : 'border-border/60 bg-card hover:bg-accent/50',
                    )}
                  >
                    <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase text-muted-foreground"><span>{String(itemIndex + 1).padStart(2, '0')} · {KIND_LABEL[item.kind as keyof typeof KIND_LABEL] || item.kind}</span>{item.status === 'crew_confirmed' && <span className="h-2 w-2 shrink-0 rounded-full bg-state-open-foreground" />}</span>
                    <span className="mt-2 line-clamp-2 block break-words text-xs leading-relaxed">{item.description}</span>
                  </button>
                ))}
              </div>
            </aside>
            <main className="min-w-0 rounded-2xl border border-border/60 bg-card p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-4">
                <div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Focused field item</p><h2 className="mt-1 font-heading text-2xl font-semibold">{index + 1} of {orderedItems.length}</h2></div>
                <ReportStatus status={selected.status === 'crew_confirmed' ? 'Awaiting review' : selected.status === 'released' ? 'Released' : selected.status === 'converted' ? 'Turned into order' : selected.status === 'held' ? 'Held' : 'Reviewed'} />
              </div>
              <ReportBlock title="Focused item" {...itemProps} items={[selected]} itemStyle="focus" />
              <div className="mt-5 flex items-center justify-between gap-2 border-t border-border pt-4">
                <Button variant="outline" size="sm" disabled={index === 0} onClick={() => setSelectedId(orderedItems[index - 1].id)}><ArrowLeft />Previous</Button>
                <span className="hidden text-xs text-muted-foreground sm:block">Select any item from the queue</span>
                <Button variant="outline" size="sm" disabled={index === orderedItems.length - 1} onClick={() => setSelectedId(orderedItems[index + 1].id)}>Next<ArrowRight /></Button>
              </div>
            </main>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
            {privateParty && <div className="border-t border-border pt-4"><SourceUpdate report={safeReport} /></div>}
            <div className="border-t border-border pt-4"><PhotoSection photos={photos} /></div>
            <div className="border-t border-border pt-4"><ReviewSummary released={released} total={items.length} privateParty={privateParty} crewName={crewName} reviewerName={reviewerName} /></div>
          </div>
        </>
      ) : <p className="border-y border-border py-10 text-center text-sm text-muted-foreground">No released field items are available.</p>}
    </>
  );
}
