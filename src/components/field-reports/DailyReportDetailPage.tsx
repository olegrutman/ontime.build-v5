import { useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Camera, ClipboardList, Clock3, ShieldCheck, TriangleAlert } from 'lucide-react';
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

export function DailyReportDetailPage({ report, items, photos, crewName, reviewerName, isCrewDraft, reviewer, privateParty, status, onChange, onBack }: Props) {
  const [category, setCategory] = useState('all');
  const visible = category === 'all' ? items : items.filter(i => i.kind === category);
  const released = items.filter(i => ['released', 'converted'].includes(i.status)).length;
  const pending = items.filter(i => i.status === 'crew_confirmed').length;
  const hours = items.filter(i => i.kind === 'hours').reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
  const blockers = items.filter(i => i.kind === 'blocker').length;
  const safeReport = privateParty ? report : { ...report, raw_text: null, audio_path: null, transcript: null };
  return <section className="min-w-0 space-y-5 pb-36 lg:pb-8" aria-label="Daily report review desk">
    <Button variant="ghost" onClick={onBack}><ArrowLeft />All daily reports</Button>
    <header className="flex flex-wrap justify-between gap-3"><div className="min-w-0"><p className="font-mono text-xs text-muted-foreground">{format(new Date(report.report_date + 'T12:00:00'), 'MMM d, yyyy')} · {report.id.slice(0, 8)}</p><h1 className="mt-1 font-heading text-4xl font-semibold">Daily Progress Report</h1><p className="mt-1 break-words text-sm text-muted-foreground">{crewName}</p></div><span className={cn('self-start rounded-full px-2.5 py-1 text-[11px] font-semibold', ['Released','Reviewed'].includes(status) ? 'bg-state-approved-bg text-state-approved-foreground' : status === 'Draft' ? 'bg-muted text-muted-foreground' : 'bg-state-open-bg text-state-open-foreground')}>{status}</span></header>
    <div className="flex flex-wrap gap-x-6 gap-y-2 border-y border-border py-3 text-xs"><span className="flex items-center gap-2"><ClipboardList size={15} /><span className="font-mono font-semibold">{items.length}</span> field items</span><span className="flex items-center gap-2"><Clock3 size={15} /><span className="font-mono font-semibold">{hours} h</span> reported</span><span className="flex items-center gap-2"><Camera size={15} />{photos.length} photos</span>{blockers > 0 && <span className="flex items-center gap-2 text-destructive"><TriangleAlert size={15} />{blockers} blocking {blockers === 1 ? 'problem' : 'problems'}</span>}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">{isCrewDraft ? <DraftEditor key={report.id} report={report} items={items} photos={photos} onChange={onChange} /> : <><div className="flex flex-wrap justify-between items-center gap-2"><h2 className="font-heading text-xl font-semibold">{reviewer ? 'Review field items' : privateParty ? 'Field items' : 'Released to project'}</h2>{reviewer && <span className="font-mono text-xs text-muted-foreground">{pending} pending</span>}</div><div className="flex flex-wrap gap-1" aria-label="Filter field items">{[['all', 'All items'], ...Object.entries(KIND_LABEL)].map(([value, title]) => <Button key={value} size="sm" variant="ghost" aria-pressed={category === value} onClick={() => setCategory(value)} className={cn('text-xs', category === value && 'bg-command text-command-foreground hover:bg-command hover:text-command-foreground')}>{title}</Button>)}</div><ReportBlock title="Field items" report={safeReport} items={visible} photos={[]} reviewer={reviewer} onChange={onChange} reviewDesk />{!visible.length && <p className="border-t border-border py-6 text-sm text-muted-foreground">No field items in this category.</p>}</>}</div>
      <aside className="min-w-0 space-y-5"><section className="border-l-2 border-primary bg-accent p-4"><p className="text-[11px] font-semibold uppercase text-muted-foreground">Reviewing company</p><h2 className="mt-1 break-words font-heading text-2xl font-semibold">{reviewerName}</h2><p className="mt-2 break-words text-xs text-muted-foreground">Reported by {crewName}</p></section>{!isCrewDraft && privateParty && (report.raw_text || report.audio_path) && <section className="space-y-3 border-t border-border pt-4"><h2 className="font-heading text-xl font-semibold">Crew’s original update</h2><ReportBlock title="Original report" report={safeReport} items={[]} photos={[]} /></section>}{!isCrewDraft && <section className="space-y-3 border-t border-border pt-4"><h2 className="font-heading text-xl font-semibold">Field photos</h2>{photos.length ? <FieldReportPhotoGallery photos={photos} title="Report photos" /> : <p className="text-xs text-muted-foreground">No photos attached.</p>}</section>}<section className="space-y-3 border-t border-border pt-4"><h2 className="font-heading text-xl font-semibold">{isCrewDraft ? 'Report visibility' : 'Review summary'}</h2>{!isCrewDraft && <div className="flex justify-between gap-3 text-xs"><span className="text-muted-foreground">Released to project</span><span className="font-mono">{released} / {items.length}</span></div>}<p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck size={16} className="shrink-0" />{privateParty ? 'Unreleased items remain private to your company and the reviewing company.' : 'Only released field updates are visible to your company.'}</p></section></aside>
    </div>
  </section>;
}