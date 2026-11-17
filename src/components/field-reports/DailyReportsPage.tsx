import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, CalendarDays, Camera, ClipboardList, Clock3, FileText, Loader2, Plus, Search, ShieldCheck, TriangleAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { C, KpiCard } from '@/components/shared/KpiCard';
import { FieldReportPhotoGallery, type FieldReportPhoto } from './FieldReportPhotoGallery';
import { cn } from '@/lib/utils';
import { DailyReportDetailPage } from './DailyReportDetailPage';

const db = supabase as any;
// Read every authorized page, not only the API's first 1,000 rows.
async function allRows(table: string, projectId: string) {
  const rows: any[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await db.from(table).select('*').eq('project_id', projectId).order('id').range(start, start + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if ((data || []).length < 1000) return rows;
  }
}
const labels: Record<string, string> = { draft: 'Draft', crew_confirmed: 'Awaiting review', reviewed: 'Reviewed', released: 'Released' };
export function DailyReportsPage({ projectId }: { projectId: string }) {
  const { user, userOrgRoles } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All reports');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');
  const orgIds = userOrgRoles.map(r => r.organization_id);
  const crewIds = userOrgRoles.filter(r => r.organization?.type === 'FC').map(r => r.organization_id);
  const key = ['daily-report-register', projectId, user?.id];
  const refresh = () => { qc.invalidateQueries({ queryKey: key }); qc.invalidateQueries({ queryKey: ['field-reports', projectId] }); qc.invalidateQueries({ queryKey: ['field-summary', projectId] }); };
  const { data, isLoading, error } = useQuery({ queryKey: key, enabled: !!user, queryFn: async () => {
    const [headers, sourceItems, photos] = await Promise.all([allRows('field_reports', projectId), allRows('field_report_items', projectId), allRows('field_report_photos', projectId)]);
    const own = (r: any) => orgIds.includes(r.crew_org_id) || orgIds.includes(r.reviewer_org_id);
    const items = sourceItems.filter(i => headers.some(r => r.id === i.report_id && own(r)) || ['released', 'converted'].includes(i.status));
    const reports = headers.filter(r => own(r) || items.some(i => i.report_id === r.id));
    for (const item of items) {
      if (!reports.some(r => r.id === item.report_id)) reports.push({ id: item.report_id, crew_org_id: item.crew_org_id, reviewer_org_id: item.reviewer_org_id, report_date: (item.released_at || item.created_at).slice(0, 10), status: 'released' });
    }
    const companyIds = [...new Set(reports.flatMap(r => [r.crew_org_id, r.reviewer_org_id]).filter(Boolean))];
    const { data: companies, error: companyError } = companyIds.length ? await db.from('organizations').select('id,name').in('id', companyIds) : { data: [], error: null };
    if (companyError) throw companyError;
    const { data: contracts, error: contractError } = crewIds.length ? await db.from('project_contracts').select('from_org_id,to_org_id').eq('project_id', projectId).in('from_org_id', crewIds) : { data: [], error: null };
    if (contractError) throw contractError;
    return { reports: reports.sort((a,b) => b.report_date.localeCompare(a.report_date) || b.id.localeCompare(a.id)), items, photos: photos as FieldReportPhoto[], companies: companies || [], pair: (contracts || []).find((c: any) => c.to_org_id) };
  }});
  const reports = data?.reports || [];
  const items = data?.items || [];
  const companyName = (r: any) => data?.companies.find((c: any) => c.id === r.crew_org_id)?.name || 'Crew';
  const reportItems = (id: string) => items.filter(i => i.report_id === id);
  const privateParty = (r: any) => orgIds.includes(r.crew_org_id) || orgIds.includes(r.reviewer_org_id);
  const status = (r: any) => !privateParty(r) ? 'Released' : labels[r.status] || 'Reviewed';
  const selected = reports.find(r => r.id === params.get('report'));
  const photosFor = (id: string) => (data?.photos || []).filter(p => p.report_id === id);
  const todayReports = reports.filter(r => r.report_date === today);
  const todayItems = items.filter(i => todayReports.some(r => r.id === i.report_id));
  const pending = reports.filter(r => orgIds.includes(r.reviewer_org_id) && reportItems(r.id).some(i => i.status === 'crew_confirmed'));
  const shown = reports.filter(r => (!date || r.report_date === date) && (filter === 'All reports' || status(r) === filter) && `${companyName(r)} ${r.id} ${reportItems(r.id).map(i => i.description).join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const open = (id?: string) => setParams(id ? { report: id } : {});
  const start = async () => {
    if (!user || !data?.pair || busy) return;
    const existing = reports.find(r => crewIds.includes(r.crew_org_id) && r.status === 'draft' && r.report_date === today);
    if (existing) { open(existing.id); return; }
    setBusy(true);
    const { data: created, error: createError } = await db.from('field_reports').insert({ project_id: projectId, crew_org_id: data.pair.from_org_id, reviewer_org_id: data.pair.to_org_id, report_date: today, created_by: user.id, status: 'draft' }).select('id').single();
    setBusy(false);
    if (createError) toast({ title: 'Could not start report', description: createError.message, variant: 'destructive' });
    else { refresh(); open(created.id); }
  };
  const statusBadge = (r: any) => <span className={cn('self-start rounded-full px-2.5 py-1 text-[11px] font-semibold', status(r) === 'Released' || status(r) === 'Reviewed' ? 'bg-state-approved-bg text-state-approved-foreground' : status(r) === 'Draft' ? 'bg-muted text-muted-foreground' : 'bg-state-open-bg text-state-open-foreground')}>{status(r)}</span>;
  if (isLoading) return <div className="flex items-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Loading daily reports…</div>;
  if (error) return <div className="py-6 space-y-3"><p className="text-destructive">Could not load daily reports.</p><Button variant="outline" onClick={refresh}>Try again</Button></div>;
  if (params.get('report') && !selected) return <div className="space-y-3 py-6"><p className="text-muted-foreground">This report is not available.</p><Button variant="outline" onClick={() => open()}><ArrowLeft />All daily reports</Button></div>;
  if (selected) return <DailyReportDetailPage key={selected.id} report={selected} items={reportItems(selected.id)} photos={photosFor(selected.id)} crewName={companyName(selected)} reviewerName={data?.companies.find((c: any) => c.id === selected.reviewer_org_id)?.name || 'Subcontractor'} isCrewDraft={selected.status === 'draft' && crewIds.includes(selected.crew_org_id)} reviewer={orgIds.includes(selected.reviewer_org_id)} privateParty={privateParty(selected)} status={status(selected)} onChange={refresh} onBack={() => open()} />;
  return <div className="space-y-4"><header className="flex flex-wrap justify-between items-end gap-3"><div><p className="text-[11px] font-semibold uppercase text-muted-foreground">Field operations</p><h1 className="font-heading text-4xl font-semibold">Daily Progress Reports</h1><p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays size={14} />{format(new Date(), 'EEEE, MMMM d, yyyy')}</p></div>{data?.pair && <Button disabled={busy} onClick={start}>{busy ? <Loader2 className="animate-spin" /> : <Plus />}New daily report</Button>}</header>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5"><KpiCard accent={C.amber} icon={<ClipboardList size={18} />} iconBg={C.amberPale} label="Reports today" value={String(todayReports.length)} sub="Reports visible to your company" /><KpiCard accent={C.blue} icon={<Clock3 size={18} />} iconBg={C.blueBg} label="Reported crew hours" value={`${todayItems.filter(i => i.kind === 'hours').reduce((s,i) => s + (Number(i.quantity) || 0), 0)} h`} sub="Reported today · not payroll" /><KpiCard accent={C.green} icon={<ShieldCheck size={18} />} iconBg={C.greenBg} label="Released updates" value={String(todayItems.filter(i => ['released','converted'].includes(i.status)).length)} sub="From today’s reports" /><KpiCard accent={C.red} icon={<TriangleAlert size={18} />} iconBg={C.redBg} label="Awaiting your review" value={String(pending.length)} sub="Reports with undecided items"><div className="p-4 space-y-2">{pending.length ? pending.map(r => <Button key={r.id} variant="outline" onClick={() => open(r.id)}>{companyName(r)} · {r.report_date}<ArrowRight /></Button>) : <p className="text-sm text-muted-foreground">No reports awaiting your review.</p>}</div></KpiCard></div>
    <div className="flex flex-wrap items-center gap-2"><div className="flex flex-wrap gap-1">{['All reports','Draft','Awaiting review','Released','Reviewed'].map(f => <Button key={f} size="sm" variant="ghost" aria-pressed={filter === f} onClick={() => setFilter(f)} className={cn('text-xs', filter === f && 'bg-command text-command-foreground hover:bg-command hover:text-command-foreground')}>{f}</Button>)}</div><div className="relative w-full sm:ml-auto sm:w-56"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search daily reports" placeholder="Search crew or report…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div><Input className="w-full sm:w-40" type="date" aria-label="Filter report date" value={date} onChange={e => setDate(e.target.value)} />{date && <Button variant="ghost" size="sm" onClick={() => setDate('')}>All dates</Button>}</div>
    <div className="space-y-3">{shown.map(r => { const entries = reportItems(r.id); const hours = entries.filter(i => i.kind === 'hours').reduce((s,i) => s + (Number(i.quantity) || 0),0); return <article key={r.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"><div className="flex flex-wrap justify-between gap-2 border-b border-border bg-accent px-4 py-3"><span className="flex items-center gap-2 text-xs"><FileText size={15} /><span className="font-mono font-semibold">{format(new Date(r.report_date + 'T12:00:00'), 'MMM d, yyyy')}</span></span>{statusBadge(r)}</div><div className="p-4 space-y-3"><div><p className="text-xs font-semibold text-muted-foreground">{companyName(r)}</p><h2 className="mt-1 font-heading text-2xl font-semibold break-words">{entries.find(i => i.kind === 'progress')?.description || entries[0]?.description || 'Daily field report'}</h2></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="flex gap-1.5 items-center"><ClipboardList size={14} />{entries.length} field updates</span><span className="flex gap-1.5 items-center"><Clock3 size={14} /><span className="font-mono">{hours} h</span></span><span className="flex gap-1.5 items-center"><Camera size={14} />{photosFor(r.id).length} photos</span></div><FieldReportPhotoGallery photos={photosFor(r.id).slice(0,3)} title="Field photos" /></div><div className="flex justify-end border-t border-border px-4 py-2"><Button variant="ghost" size="sm" onClick={() => open(r.id)}>{r.status === 'draft' && crewIds.includes(r.crew_org_id) ? 'Continue report' : orgIds.includes(r.reviewer_org_id) && entries.some(i => i.status === 'crew_confirmed') ? 'Review report' : 'Open report'}<ArrowRight /></Button></div></article>; })}{!shown.length && <div className="border-t border-border py-10 text-center"><ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><h2 className="font-heading text-2xl">{reports.length ? 'No matching reports' : 'No daily reports yet'}</h2><p className="mt-1 text-sm text-muted-foreground">{reports.length ? 'Try another date or search.' : 'Released field updates will appear here.'}</p></div>}</div>
  </div>;
}