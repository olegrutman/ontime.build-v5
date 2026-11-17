import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Mic, Square, Plus, Trash2, Send, Check, Pause, Loader2, ClipboardList, Sparkles, FileText, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { conversionFor, createWorkOrderFromItem, createMaterialOrderFromItem } from '@/lib/fieldItemConversion';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldReportPhotoEditor } from './FieldReportPhotoEditor';
import { FieldReportPhotoGallery, type FieldReportPhoto } from './FieldReportPhotoGallery';

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
          <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Released by Subcontractor</p>
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

function ItemRow({ item, children }: { item: any; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <Badge variant="outline" className="text-[0.7rem]">{KIND_LABEL[item.kind as Kind] || item.kind}</Badge>
          <p className="text-sm break-words">{item.description}</p>
          {(item.location || item.quantity != null) && (
            <p className="text-xs text-muted-foreground break-words">
              {item.location}{item.location && item.quantity != null ? ' · ' : ''}{item.quantity != null ? `${item.quantity} ${item.unit || ''}` : ''}
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

export function ReportBlock({ title, report, items, photos, reviewer, onChange }: { title: string; report: any; items: any[]; photos: FieldReportPhoto[]; reviewer?: boolean; onChange?: () => void }) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const loadAudio = async () => {
    const { data } = await supabase.storage.from('field-audio').createSignedUrl(report.audio_path, 600);
    setAudioUrl(data?.signedUrl || null);
  };
  return (
    <div className="space-y-2">
      <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">{title}</p>
      {report.raw_text && <p className="text-sm whitespace-pre-wrap break-words rounded-xl bg-muted/50 p-3">{report.raw_text}</p>}
      {report.audio_path && (audioUrl
        ? <audio controls src={audioUrl} className="w-full" />
        : <Button variant="outline" size="sm" onClick={loadAudio}><Mic className="h-4 w-4 mr-1" />Play voice note</Button>)}
      <FieldReportPhotoGallery photos={photos} />
      {items.map(i => (
        <ItemRow key={i.id} item={i}>
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
        await createMaterialOrderFromItem(item);
        toast({ title: 'Draft material order created', description: 'Review it under Orders before sending to the supplier.' });
        onChange();
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
  if (item.converted_po_id) return <Button size="sm" variant="link" className="px-0" onClick={() => navigate(`/project/${item.project_id}/purchase-orders`)}>Open material orders</Button>;
  return null;
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
      const found = (data?.items || []) as Array<{ kind: Kind; description: string; location: string | null; quantity: number | null; unit: string | null }>;
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
        created_by: u.user?.id, status: 'draft', ai_generated: true,
      })));
      if (insErr) throw new Error(insErr.message);
      toast({ title: `${found.length} item${found.length === 1 ? '' : 's'} added`, description: 'Check each one. Remove anything that is wrong before sending.' });
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
    else { toast({ title: 'Report sent to your Subcontractor' }); onChange(); }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Tell your Subcontractor what happened today. Only they see this until they release each item. Don't include prices.</p>
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
      <p className="text-xs text-muted-foreground">Sort into items reads your update or voice note and adds items below. Check them before sending.</p>
      {report.transcript && <p className="text-xs rounded-lg bg-muted p-2"><span className="font-medium">Voice note text:</span> {report.transcript}</p>}

      <FieldReportPhotoEditor report={report} photos={photos} onChange={onChange} />

      <div className="rounded-xl border p-3 space-y-2">
        <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">Add an item</p>
        <Select value={kind} onValueChange={v => setKind(v as Kind)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{(Object.keys(KIND_LABEL) as Kind[]).map(k => <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>)}</SelectContent>
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
          <Button size="sm" variant="ghost" onClick={() => removeItem(i.id)}><Trash2 className="h-4 w-4 mr-1" />Remove</Button>
        </ItemRow>
      ))}

      <Button className="w-full" onClick={submit} disabled={busy || items.length === 0}>
        {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}Send to Subcontractor
      </Button>
      {items.length === 0 && <p className="text-xs text-muted-foreground text-center">Add at least one item to send.</p>}
    </div>
  );
}
