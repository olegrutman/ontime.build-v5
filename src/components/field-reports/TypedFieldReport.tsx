import { format } from 'date-fns';
import { FileText, Printer, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportBlock } from './FieldReportsCard';
import { FieldReportPhotoGallery, type FieldReportPhoto } from './FieldReportPhotoGallery';

interface Props {
  report: any;
  items: any[];
  photos: FieldReportPhoto[];
  projectName: string;
  projectAddress?: string;
  crewName: string;
  reviewerName: string;
  reviewer: boolean;
  status: string;
  onChange: () => void;
}

const sections = [
  { number: '01', kind: 'progress', title: 'Work performed', empty: 'No progress entries recorded.' },
  { number: '02', kind: 'hours', title: 'Workforce & hours', empty: 'No crew hours recorded.' },
  { number: '03', kind: 'material', title: 'Materials & deliveries', empty: 'No material entries recorded.' },
  { number: '04', kind: 'blocker', title: 'Delays, blockers & site conditions', empty: 'No delays or blocking problems recorded.' },
  { number: '05', kind: 'extra_work', title: 'Additional work', empty: 'No additional work recorded.' },
];

export function TypedFieldReport({ report, items, photos, projectName, projectAddress, crewName, reviewerName, reviewer, status, onChange }: Props) {
  const reportNumber = `FR-${report.id.slice(0, 8).toUpperCase()}`;
  const reportDate = format(new Date(`${report.report_date}T12:00:00`), 'MMMM d, yyyy');
  const hours = items.filter(item => item.kind === 'hours').reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const released = items.filter(item => ['released', 'converted'].includes(item.status)).length;
  const itemProps = { report, photos: [], reviewer, onChange, reviewDesk: true };

  return (
    <div className="min-w-0 rounded-2xl bg-muted/40 p-2 sm:p-5 lg:p-8">
      <div className="no-print mx-auto mb-4 flex w-full max-w-[900px] flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs text-muted-foreground"><FileText size={15} />Print-ready jobsite document · Review actions stay available on screen</p>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer />Print / Save PDF</Button>
      </div>

      <article className="field-report-print mx-auto w-full max-w-[900px] border border-border bg-card text-card-foreground shadow-lg" aria-label={`Typed Field Report ${reportNumber}`}>
        <header className="border-b-[3px] border-command px-5 py-6 sm:px-9 sm:py-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ontime.build / Field operations</p>
              <h2 className="mt-3 font-heading text-4xl font-bold uppercase leading-none tracking-wide sm:text-5xl">Field Report</h2>
              <p className="mt-2 text-sm text-muted-foreground">Daily work record</p>
            </div>
            <div className="max-w-full border-2 border-command px-4 py-2 text-center">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Report status</p>
              <p className="mt-1 break-words font-heading text-xl font-bold uppercase tracking-wide">{status}</p>
            </div>
          </div>
        </header>

        <dl className="grid grid-cols-2 border-b border-border sm:grid-cols-4">
          <SheetField label="Project" value={projectName} className="col-span-2" />
          <SheetField label="Report date" value={reportDate} />
          <SheetField label="Report number" value={reportNumber} mono />
          {projectAddress && <SheetField label="Job address" value={projectAddress} className="col-span-2 sm:col-span-4" />}
          <SheetField label="Reported by" value={crewName} className="col-span-2" />
          <SheetField label="Reviewing company" value={reviewerName} className="col-span-2" />
          <SheetField label="Reported hours" value={`${hours} h`} mono />
          <SheetField label="Released updates" value={`${released} / ${items.length}`} mono />
          <SheetField label="Field items" value={String(items.length)} mono />
          <SheetField label="Photos attached" value={String(photos.length)} mono />
        </dl>

        <div className="space-y-0 px-5 sm:px-9">
          {sections.map(section => {
            const entries = items.filter(item => item.kind === section.kind);
            return (
              <section key={section.kind} className="border-b border-border py-6 last:border-b-0" aria-label={section.title}>
                <div className="mb-1 flex items-baseline gap-3 border-b border-command/20 pb-2">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">{section.number}</span>
                  <h3 className="font-heading text-xl font-bold uppercase tracking-wide">{section.title}</h3>
                </div>
                {entries.length ? (
                  <ReportBlock title={section.title} {...itemProps} items={entries} itemStyle="typed" />
                ) : (
                  <p className="py-4 font-mono text-xs italic text-muted-foreground">{section.empty}</p>
                )}
              </section>
            );
          })}

          {report.raw_text && (
            <section className="border-t border-border py-6" aria-label="Original field notes">
              <div className="mb-3 flex items-baseline gap-3 border-b border-command/20 pb-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground">06</span>
                <h3 className="font-heading text-xl font-bold uppercase tracking-wide">Original field notes</h3>
              </div>
              <p className="whitespace-pre-wrap break-words border-l-2 border-border pl-4 text-sm leading-7 text-muted-foreground">{report.raw_text}</p>
              {report.audio_path && <p className="mt-3 font-mono text-[11px] text-muted-foreground">Voice note attached to the digital report.</p>}
            </section>
          )}

          <section className="border-t border-border py-6" aria-label="Field photos">
            <div className="mb-4 flex items-baseline gap-3 border-b border-command/20 pb-2">
              <span className="font-mono text-xs font-semibold text-muted-foreground">{report.raw_text ? '07' : '06'}</span>
              <h3 className="font-heading text-xl font-bold uppercase tracking-wide">Field photos</h3>
            </div>
            {photos.length ? <FieldReportPhotoGallery photos={photos} title="Jobsite photo record" /> : <p className="font-mono text-xs italic text-muted-foreground">No photos attached.</p>}
          </section>
        </div>

        <footer className="border-t border-border px-5 py-6 sm:px-9">
          <div className="grid gap-7 sm:grid-cols-2 sm:gap-10">
            <div>
              <div className="min-h-10 border-b border-foreground/40 pb-2 text-sm font-medium">{crewName}</div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Reporting company</p>
            </div>
            <div>
              <div className="min-h-10 border-b border-foreground/40 pb-2 text-sm font-medium">{reviewerName}</div>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">Reviewing company · {status}</p>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground"><ShieldCheck size={14} />Operational field record · No pricing shown</p>
            <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{reportNumber} · {reportDate}</p>
          </div>
        </footer>
      </article>
    </div>
  );
}

function SheetField({ label, value, mono = false, className = '' }: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className={`min-w-0 border-b border-r border-border p-4 last:border-r-0 even:border-r-0 sm:even:border-r sm:[&:nth-child(4n)]:border-r-0 ${className}`}>
      <dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className={`mt-1.5 break-words text-sm font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
