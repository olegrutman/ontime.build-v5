import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mic, Square, Plus, Trash2, Send, Check, Pause, Loader2, ClipboardList, Sparkles, FileText, Package, CheckCircle2, TriangleAlert, Clock3, MapPin, Truck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { conversionFor, createWorkOrderFromItem, createMaterialOrderFromItem } from '@/lib/fieldItemConversion';
import { trimRequestFromMaterialContext } from '@/lib/trimMaterial';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldReportPhotoEditor } from './FieldReportPhotoEditor';
import { FieldReportPhotoGallery, type FieldReportPhoto } from './FieldReportPhotoGallery';
import { FieldMaterialPicker } from './FieldMaterialPicker';
import { FieldMaterialMatch } from './FieldMaterialMatch';
import { fieldMaterialOrderStatusLabel, isStructuredMaterialItem } from '@/lib/fieldMaterialRequests';
import { cn } from '@/lib/utils';

const db = supabase as any;
type Kind = 'progress' | 'material' | 'extra_work' | 'blocker' | 'hours';
export const KIND_LABEL: Record<Kind, string> = {
  progress: 'Progress', material: 'Material needed', extra_work: 'Extra work', blocker: 'Blocking problem', hours: 'Hours',
};
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', crew_confirmed: 'Awaiting review', reviewed: 'Reviewed', released: 'Released', held: 'Held', converted: 'Turned into order',
};

interface Props { projectId: string; date: string }

export function FieldReportsCard({ projectId, date }: Props) {
  const { userOrgRoles } = useAuth();
  const myOrgs = useMemo(() => userOrgRoles.map((r: any) => r.organization_id).filter(Boolean) as string[], [userOrgRoles]);
  const qc = useQueryClient();
  const { toast } = useToast();

  // Which Subcontractor hired my company on this project (crew side).
  const { data: pairs = [] } = useQuery({
    queryKey: ['field-pairs', projectId, myOrgs],
    enabled: myOrgs.length > 0,
    queryFn: async () => {
      const { data } = await db.from('project_contracts').select('from_org_id,to_org_id').eq('project_id', projectId).in('from_org_id', myOrgs);
      return (data || []).filter((c: any) => c.to_org_id) as { from_org_id: string; to_org_id: string }[];
    },
  });

  const key = ['field-reports', projectId, date];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data: reports } = await db.from('field_reports').select('*').eq('project_id', projectId).eq('report_date', date).order('created_at');
      const ids = (reports || []).map((r: any) => r.id);
      const next = new Date(date + 'T00:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
      const [{ data: own }, { data: rel }, { data: photos, error: photoError }] = await Promise.all([
        ids.length ? db.from('field_report_items').select('*').in('report_id', ids).order('created_at') : Promise.resolve({ data: [] }),
        db.from('field_report_items').select('*').eq('project_id', projectId).in('status', ['released', 'converted'])
          .gte('released_at', date + 'T00:00:00Z').lt('released_at', next.toISOString()).order('released_at'),
        ids.length ? db.from('field_report_photos').select('*').in('report_id', ids).order('created_at') : Promise.resolve({ data: [], error: null }),
      ]);
      if (photoError) throw photoError;
      const seen = new Set((own || []).map((i: any) => i.id));
      const items = [...(own || []), ...(rel || []).filter((i: any) => !seen.has(i.id))];
      return { reports: reports || [], items, photos: photos || [] };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const reports: any[] = data?.reports || [];
  const items: any[] = data?.items || [];
  const photos: FieldReportPhoto[] = data?.photos || [];

  const crewPair = pairs[0];
  const myDraft = reports.find(r => r.status === 'draft' && myOrgs.includes(r.crew_org_id));
  const toReview = reports.filter(r => myOrgs.includes(r.reviewer_org_id) && r.status !== 'draft');
  const mySent = reports.filter(r => myOrgs.includes(r.crew_org_id) && r.status !== 'draft');
  const partyIds = new Set(reports.map(r => r.id));
  const releasedOnly = items.filter(i => !partyIds.has(i.report_id));

  const startReport = async () => {
    if (!crewPair) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from('field_reports').insert({
      project_id: projectId, crew_org_id: crewPair.from_org_id, reviewer_org_id: crewPair.to_org_id,
      report_date: date, created_by: u.user?.id, status: 'draft',
    });
    if (error) toast({ title: 'Could not start report', description: error.message, variant: 'destructive' });
    refresh();
  };

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
          <h3 className="text-base font-semibold">Field report</h3>
        </div>
        {crewPair && !myDraft && (
          <Button size="sm" onClick={startReport} className="shrink-0"><Plus className="h-4 w-4 mr-1" />New report</Button>
        )}
      </div>

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

      {myDraft && <DraftEditor report={myDraft} items={items.filter(i => i.report_id === myDraft.id)} photos={photos.filter(p => p.report_id === myDraft.id)} onChange={refresh} />}

      {mySent.map(r => (
        <ReportBlock key={r.id} title="Sent for review" report={r} items={items.filter(i => i.report_id === r.id)} photos={photos.filter(p => p.report_id === r.id)} />
      ))}

      {toReview.map(r => (
        <ReportBlock key={r.id} title="From your crew" report={r} items={items.filter(i => i.report_id === r.id)} photos={photos.filter(p => p.report_id === r.id)} reviewer onChange={refresh} />
      ))}

      {releasedOnly.length > 0 && (
        <div className="space-y-2">
          <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Released by reviewer</p>
          {releasedOnly.map(i => <ItemRow key={i.id} item={i} />)}
        </div>
      )}

      {!isLoading && !myDraft && reports.length === 0 && releasedOnly.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {crewPair ? 'No field report for this day yet. Tap "New report" to write or record one.' : 'No field updates for this day.'}
        </p>
      )}
    </div>
  );
}

function ItemRow({ item, children, reviewDesk, itemStyle = 'card' }: { item: any; children?: React.ReactNode; reviewDesk?: boolean; itemStyle?: 'card' | 'document' | 'focus' | 'typed' }) {
  if (reviewDesk) {
    const Icon = item.kind === 'progress' ? CheckCircle2 : item.kind === 'material' ? Package : item.kind === 'blocker' ? TriangleAlert : item.kind === 'hours' ? Clock3 : Plus;
    const tone = item.kind === 'blocker' ? 'bg-destructive/10 text-destructive' : item.kind === 'progress' ? 'bg-state-approved-bg text-state-approved' : item.kind === 'material' || item.kind === 'hours' ? 'bg-type-sov/10 text-type-sov' : 'bg-state-open-bg text-state-open-foreground';
    const articleClass = itemStyle === 'document'
      ? 'border-b border-border px-1 py-5 last:border-b-0'
      : itemStyle === 'typed'
        ? 'border-b border-border py-4 last:border-b-0'
        : itemStyle === 'focus'
          ? 'p-0'
          : 'rounded-2xl border border-border/60 bg-card p-4 shadow-sm';
    return <article className={articleClass}><div className="flex gap-3"><span className={`flex shrink-0 items-center justify-center ${itemStyle === 'typed' ? 'h-7 w-7 rounded-sm' : 'h-9 w-9'} ${itemStyle === 'document' ? 'rounded-full' : itemStyle === 'typed' ? '' : 'rounded-lg'} ${tone}`}><Icon size={itemStyle === 'typed' ? 14 : 17} /></span><div className="min-w-0 flex-1 space-y-2"><div className="flex flex-wrap justify-between items-start gap-2"><p className={cn('text-[11px] font-semibold uppercase text-muted-foreground', itemStyle === 'typed' && 'font-mono text-[10px] tracking-wide')}>{KIND_LABEL[item.kind as Kind] || item.kind}</p><Badge variant="outline" className={cn('max-w-full whitespace-normal text-[11px]', itemStyle === 'typed' && 'rounded-sm font-mono text-[10px] font-normal')}>{STATUS_LABEL[item.status] || item.status}</Badge></div><p className={cn('break-words leading-relaxed', itemStyle === 'focus' ? 'text-base sm:text-lg' : itemStyle === 'typed' ? 'text-[15px] leading-7' : 'text-sm')}>{item.description}</p>{isStructuredMaterialItem(item) && <p className="font-mono text-[11px] text-muted-foreground">SKU {item.material_context?.sku || 'Catalog selection'} · Exact catalog product</p>}{(item.location || (item.quantity != null && item.kind !== 'progress')) && <p className={cn('flex items-start gap-1.5 text-xs text-muted-foreground', itemStyle === 'typed' && 'font-mono text-[11px]')}><MapPin size={13} className="shrink-0" /><span className="min-w-0 break-words">{item.location}{item.location && (item.quantity != null && item.kind !== 'progress') ? ' · ' : ''}{(item.quantity != null && item.kind !== 'progress') ? `${item.quantity} ${item.unit || ''}` : ''}</span></p>}{item.hold_reason && <p className="break-words text-xs text-destructive">Held: {item.hold_reason}</p>}<div className={cn('flex flex-wrap gap-2 pt-1', itemStyle === 'typed' && 'report-item-actions')}>{children}</div></div></div></article>;
  }
  return (
    <div className="rounded-xl border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <Badge variant="outline" className="text-[0.7rem]">{KIND_LABEL[item.kind as Kind] || item.kind}</Badge>
          <p className="text-sm break-words">{item.description}</p>
          {isStructuredMaterialItem(item) && <p className="font-mono text-[11px] text-muted-foreground">SKU {item.material_context?.sku || 'Catalog selection'} · Exact catalog product</p>}
          {(item.location || (item.quantity != null && item.kind !== 'progress')) && (
            <p className="text-xs text-muted-foreground break-words">
              {item.location}{item.location && (item.quantity != null && item.kind !== 'progress') ? ' · ' : ''}{(item.quantity != null && item.kind !== 'progress') ? `${item.quantity} ${item.unit || ''}` : ''}
            </p>
          )}
          {item.hold_reason && <p className="text-xs text-destructive break-words">Held: {item.hold_reason}</p>}
        </div>
        <Badge variant="secondary" className="shrink-0 text-[0.7rem]">{STATUS_LABEL[item.status] || item.status}</Badge>
      </div>
      {children}
    </div>
  );
}

export function ReportBlock({ title, report, items, photos, reviewer, onChange, reviewDesk, itemStyle = 'card' }: { title: string; report: any; items: any[]; photos: FieldReportPhoto[]; reviewer?: boolean; onChange?: () => void; reviewDesk?: boolean; itemStyle?: 'card' | 'document' | 'focus' | 'typed' }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const loadAudio = async () => {
    const { data } = await supabase.storage.from('field-audio').createSignedUrl(report.audio_path, 600);
    setAudioUrl(data?.signedUrl || null);
  };
  return (
    <div className={reviewDesk && itemStyle === 'document' ? '' : 'space-y-2'}>
      {!reviewDesk && <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{title}</p>}
      {!reviewDesk && report.raw_text && <p className="text-sm whitespace-pre-wrap break-words rounded-xl bg-muted/50 p-3">{report.raw_text}</p>}
      {!reviewDesk && report.audio_path && (audioUrl
        ? <audio controls src={audioUrl} className="w-full" />
        : <Button variant="outline" size="sm" onClick={loadAudio}><Mic className="h-4 w-4 mr-1" />Play voice note</Button>)}
      <FieldReportPhotoGallery photos={photos} />
      {items.map(i => (
        <ItemRow key={i.id} item={i} reviewDesk={reviewDesk} itemStyle={itemStyle}>
          {reviewer && onChange && i.status === 'crew_confirmed' && <ReviewActions item={i} onChange={onChange} />}
          {reviewer && onChange && conversionFor(i) && <ConvertAction item={i} onChange={onChange} />}
          {i.status === 'converted' && <ConvertedLink item={i} />}
        </ItemRow>
      ))}
    </div>
  );
}

function ConvertAction({ item, onChange }: { item: any; onChange: () => void }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const kind = conversionFor(item);
  const run = async () => {
    if (!user || !kind) return;
    setBusy(true);
    try {
      if (kind === 'work_order') {
        const id = await createWorkOrderFromItem(item, user.id);
        toast({ title: 'Draft order created', description: 'Add pricing on the order page, then submit it.' });
        onChange(); navigate(`/project/${item.project_id}/change-orders/${id}`);
      } else {
        const id = await createMaterialOrderFromItem(item);
        const trimRequest = trimRequestFromMaterialContext(item.description, item.material_context);
        toast({
          title: 'Draft material order created',
          description: trimRequest ? 'Choose the project-matched trim and confirm its quantity before sending.' : 'Review it under Orders before sending to the supplier.',
        });
        onChange();
        const params = new URLSearchParams({ tab: 'purchase-orders', edit_po: id });
        if (trimRequest) params.set('field_item', item.id);
        navigate(`/project/${item.project_id}/purchase-orders?${params.toString()}`);
      }
    } catch (e: any) {
      toast({ title: 'Could not create the order', description: e.message, variant: 'destructive' });
    } finally { setBusy(false); }
  };
  return (
    <Button size="sm" variant="outline" disabled={busy} onClick={run}>
      {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : kind === 'work_order' ? <FileText className="h-4 w-4 mr-1" /> : <Package className="h-4 w-4 mr-1" />}
      {kind === 'work_order' ? 'Make work order' : 'Make material order'}
    </Button>
  );
}

function ConvertedLink({ item }: { item: any }) {
  const navigate = useNavigate();
  if (item.converted_co_id) return <Button size="sm" variant="link" className="px-0" onClick={() => navigate(`/project/${item.project_id}/change-orders/${item.converted_co_id}`)}>Open work order</Button>;
  if (item.converted_po_id) {
    return <MaterialOrderLink item={item} />;
  }
  return null;
}

function MaterialOrderLink({ item }: { item: any }) {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['field-material-order-status', item.id, item.converted_po_id],
    queryFn: async () => {
      const { data, error } = await db.rpc('field_material_order_status', { p_item_id: item.id });
      if (error) throw error;
      return (data || [])[0] as { status: string; supplier_name: string } | undefined;
    },
  });
  const trimRequest = trimRequestFromMaterialContext(item.description, item.material_context);
  const params = new URLSearchParams({ tab: 'purchase-orders', edit_po: item.converted_po_id });
  if (trimRequest) params.set('field_item', item.id);
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      {data && <Badge variant="outline" className="whitespace-normal" title={data.supplier_name}>{fieldMaterialOrderStatusLabel(data.status)}</Badge>}
      <Button size="sm" variant="link" className="px-0" onClick={() => navigate(`/project/${item.project_id}/purchase-orders?${params.toString()}`)}>Open material order</Button>
    </div>
    <MaterialReceipt item={item} orderStatus={data?.status} />
  </div>;
}

const SENT_STATUSES = ['ORDERED', 'READY_FOR_DELIVERY', 'DELIVERED', 'FINALIZED'];

function MaterialReceipt({ item, orderStatus }: { item: any; orderStatus?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(item.received_quantity ?? item.quantity ?? ''));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ q: number; at: string } | null>(null);
  const received = saved ?? (item.received_quantity != null ? { q: Number(item.received_quantity), at: item.received_at } : null);
  if (!orderStatus || !SENT_STATUSES.includes(orderStatus)) return null;
  const unit = item.unit || 'pcs';
  const save = async () => {
    setBusy(true);
    const { error } = await db.rpc('confirm_field_material_receipt', { p_item_id: item.id, p_quantity: Number(qty) });
    setBusy(false);
    if (error) { toast({ title: 'Could not record delivery', description: error.message, variant: 'destructive' }); return; }
    setSaved({ q: Number(qty), at: new Date().toISOString() });
    setOpen(false);
    toast({ title: 'Delivery recorded' });
    qc.invalidateQueries({ queryKey: ['field-reports'] });
  };
  if (open) return (
    <div className="flex flex-wrap items-center gap-2">
      <Input aria-label="Quantity received" type="number" inputMode="decimal" min="0" className="w-24" value={qty} onChange={e => setQty(e.target.value)} />
      <span className="text-xs text-muted-foreground">{unit} arrived on site</span>
      <Button size="sm" disabled={busy || !(Number(qty) > 0)} onClick={save}>Save</Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {received && <Badge variant="secondary" className="whitespace-normal"><Truck className="h-3 w-3 mr-1" />Received {received.q} {unit} on site{received.at ? ` · ${new Date(received.at).toLocaleDateString()}` : ''}</Badge>}
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Truck className="h-4 w-4 mr-1" />{received ? 'Change received amount' : 'Confirm delivery'}</Button>
    </div>
  );
}

function ReviewActions({ item, onChange }: { item: any; onChange: () => void }) {
  const { toast } = useToast();
  const [holding, setHolding] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const decide = async (decision: 'release' | 'hold') => {
    setBusy(true);
    const { error } = await db.rpc('decide_field_item', { p_item_id: item.id, p_decision: decision, p_reason: decision === 'hold' ? reason : null });
    // Stay locked after success until the refreshed list replaces these buttons, so a second tap can't re-decide the item.
    if (error) { setBusy(false); toast({ title: 'Could not save decision', description: error.message, variant: 'destructive' }); }
    else onChange();
  };
  if (holding) return (
    <div className="flex flex-col sm:flex-row gap-2">
      <Input placeholder="Why are you holding this?" value={reason} onChange={e => setReason(e.target.value)} />
      <div className="flex gap-2 shrink-0">
        <Button size="sm" variant="destructive" disabled={!reason.trim() || busy} onClick={() => decide('hold')}>Hold</Button>
        <Button size="sm" variant="ghost" onClick={() => setHolding(false)}>Cancel</Button>
      </div>
    </div>
  );
  return (
    <div className="flex gap-2 flex-wrap">
      <Button size="sm" disabled={busy} onClick={() => decide('release')}><Check className="h-4 w-4 mr-1" />Release to project</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => setHolding(true)}><Pause className="h-4 w-4 mr-1" />Hold</Button>
    </div>
  );
}

export function DraftEditor({ report, items, photos, onChange }: { report: any; items: any[]; photos: FieldReportPhoto[]; onChange: () => void }) {
  const { toast } = useToast();
  const [text, setText] = useState(report.raw_text || '');
  const [kind, setKind] = useState<Kind>('progress');
  const [desc, setDesc] = useState('');
  const [loc, setLoc] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const autoSortRef = useRef(false);
  const dictate = () => { if (!recording) autoSortRef.current = true; void toggleRecord(); };

  const saveText = async () => {
    if (text === (report.raw_text || '')) return;
    await db.from('field_reports').update({ raw_text: text }).eq('id', report.id);
    onChange();
  };

  const addItem = async () => {
    if (!desc.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from('field_report_items').insert({
      report_id: report.id, project_id: report.project_id, crew_org_id: report.crew_org_id, reviewer_org_id: report.reviewer_org_id,
      kind, description: desc.trim(), location: loc.trim() || null, quantity: qty ? Number(qty) : null, unit: unit.trim() || null,
      created_by: u.user?.id, status: 'draft',
    });
    if (error) { toast({ title: 'Could not add item', description: error.message, variant: 'destructive' }); return; }
    setDesc(''); setLoc(''); setQty(''); setUnit('');
    onChange();
  };

  const [sorting, setSorting] = useState(false);
  const sortWithAi = async () => {
    setSorting(true);
    try {
      await saveText();
      const { data, error } = await supabase.functions.invoke('field-report-sort', { body: { report_id: report.id } });
      let serverMsg: string | undefined = data?.error;
      if (error && !serverMsg) { try { serverMsg = (await (error as any).context?.json?.())?.error; } catch { /* ignore */ } }
      if (error || serverMsg) throw new Error(serverMsg || 'Could not sort the update');
      const found = (data?.items || []) as Array<{ kind: Kind; description: string; location: string | null; quantity: number | null; unit: string | null; material_context?: { application: 'exterior' | 'interior' | null; window_count: number | null; dimension: string | null } | null }>;
      if (data?.transcript && !report.transcript) await db.from('field_reports').update({ transcript: data.transcript }).eq('id', report.id);
      if (found.length) {
        // A new sort replaces earlier automatic drafts; items the crew typed by hand stay.
        const { error: delErr } = await db.from('field_report_items').delete().eq('report_id', report.id).eq('status', 'draft').eq('ai_generated', true);
        if (delErr) throw new Error(delErr.message);
      }
      if (!found.length) { toast({ title: 'No items found', description: 'Add more detail, or add items by hand.' }); return; }
      const { data: u } = await supabase.auth.getUser();
      const { error: insErr } = await db.from('field_report_items').insert(found.map(f => ({
        report_id: report.id, project_id: report.project_id, crew_org_id: report.crew_org_id, reviewer_org_id: report.reviewer_org_id,
        kind: f.kind, description: f.description, location: f.location, quantity: f.quantity, unit: f.unit,
        material_context: f.material_context ?? {},
        created_by: u.user?.id, status: 'draft', ai_generated: true,
      })));
      if (insErr) throw new Error(insErr.message);
      toast({ title: `${found.length} item${found.length === 1 ? '' : 's'} added`, description: found.some(f => f.kind === 'material') ? 'Materials found — choose the exact product for each before sending.' : 'Check each one. Remove anything that is wrong before sending.' });
      onChange();
    } catch (e: any) {
      toast({ title: 'Could not sort the update', description: e.message, variant: 'destructive' });
    } finally { setSorting(false); }
  };

  const removeItem = async (id: string) => { await db.from('field_report_items').delete().eq('id', id); onChange(); };

  const toggleRecord = async () => {
    if (recording) { recRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = e => e.data.size && chunks.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        setRecording(false);
        const type = rec.mimeType || 'audio/webm';
        const ext = type.includes('mp4') ? 'm4a' : 'webm';
        const path = `${report.id}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('field-audio').upload(path, new Blob(chunks.current, { type }), { contentType: type });
        if (error) { toast({ title: 'Could not save recording', description: error.message, variant: 'destructive' }); return; }
        await db.from('field_reports').update({ audio_path: path, transcript: null }).eq('id', report.id);
        toast({ title: 'Voice note saved' });
        onChange();
        if (autoSortRef.current) { autoSortRef.current = false; void sortWithAi(); }
      };
      rec.start(); recRef.current = rec; setRecording(true);
    } catch {
      toast({ title: 'Microphone not available', description: 'Allow microphone access, or type your update instead.', variant: 'destructive' });
    }
  };

  const submit = async () => {
    setBusy(true);
    await saveText();
    const { error } = await db.rpc('submit_field_report', { p_report_id: report.id });
    setBusy(false);
    if (error) toast({ title: 'Could not send report', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Report sent for review' }); onChange(); }
  };

  return (
    <div className="space-y-3">
      <Button type="button" onClick={dictate} disabled={sorting} variant={recording ? 'destructive' : 'default'}
        aria-label={recording ? 'Stop and sort site update' : 'Dictate site update'}
        className="lg:hidden fixed left-4 bottom-24 z-30 h-14 rounded-full px-5 shadow-lg">
        {sorting ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : recording ? <Square className="h-5 w-5 mr-2" /> : <Mic className="h-5 w-5 mr-2" />}
        {sorting ? 'Sorting…' : recording ? 'Stop & sort' : 'Dictate'}
      </Button>
      <p className="text-sm text-muted-foreground">Tell your reviewing company what happened today. Only they see this until they release each item. Don't include prices.</p>
      <Textarea rows={3} placeholder="What got done, what you need, what's stopping you…" value={text} onChange={e => setText(e.target.value)} onBlur={saveText} />
      <div className="flex items-center gap-2 flex-wrap">
        <Button type="button" variant={recording ? 'destructive' : 'outline'} size="sm" onClick={toggleRecord}>
          {recording ? <><Square className="h-4 w-4 mr-1" />Stop recording</> : <><Mic className="h-4 w-4 mr-1" />{report.audio_path ? 'Re-record voice note' : 'Record voice note'}</>}
        </Button>
        {report.audio_path && !recording && <span className="text-xs text-muted-foreground">Voice note attached</span>}
        <Button type="button" size="sm" onClick={sortWithAi} disabled={sorting || recording || (!text.trim() && !report.audio_path)}>
          {sorting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}Sort into items
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Sort into items reads your update or voice note and adds items below. For exact products and quantities, use Choose materials instead—it does not use AI.</p>
      {report.transcript && <p className="text-xs rounded-lg bg-muted p-2"><span className="font-medium">Voice note text:</span> {report.transcript}</p>}

      <FieldReportPhotoEditor report={report} photos={photos} onChange={onChange} />

      <div className="rounded-xl border border-type-sov/30 bg-type-sov/5 p-3 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 space-y-1">
            <p className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-wide text-muted-foreground"><Package className="h-3.5 w-3.5" />Material request</p>
            <p className="text-xs text-muted-foreground">Pick exact products and quantities from a project catalog. Your reviewing company will create and send the order.</p>
          </div>
          <FieldMaterialPicker report={report} onSaved={onChange} />
        </div>
      </div>

      <div className="rounded-xl border p-3 space-y-2">
        <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Add another update</p>
        <Select value={kind} onValueChange={v => setKind(v as Kind)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{(Object.keys(KIND_LABEL) as Kind[]).filter(k => k !== 'material').map(k => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Describe it" value={desc} onChange={e => setDesc(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Input placeholder="Where (optional)" value={loc} onChange={e => setLoc(e.target.value)} />
          <Input type="number" inputMode="decimal" placeholder={kind === 'hours' ? 'Hours' : 'Qty (optional)'} value={qty} onChange={e => setQty(e.target.value)} />
          <Input placeholder="Unit (optional)" value={unit} onChange={e => setUnit(e.target.value)} />
        </div>
        <Button size="sm" variant="outline" onClick={addItem} disabled={!desc.trim()}><Plus className="h-4 w-4 mr-1" />Add item</Button>
      </div>

      {items.map(i => (
        <ItemRow key={i.id} item={i}>
          <div className="flex flex-wrap gap-2">
            {isStructuredMaterialItem(i) && <FieldMaterialPicker report={report} item={i} onSaved={onChange} />}
            {i.kind === 'material' && !isStructuredMaterialItem(i) && <FieldMaterialMatch report={report} item={i} onSaved={onChange} />}
            <Button size="sm" variant="ghost" onClick={() => removeItem(i.id)}><Trash2 className="h-4 w-4 mr-1" />Remove</Button>
          </div>
        </ItemRow>
      ))}

      <Button className="w-full" onClick={submit} disabled={busy || items.length === 0}>
        {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}Send for review
      </Button>
      {items.length === 0 && <p className="text-xs text-muted-foreground text-center">Add at least one item to send.</p>}
    </div>
  );
}
