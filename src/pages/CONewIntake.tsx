import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useOrgType } from '@/hooks/useOrgType';
import { useStartAiIntake, useAiIntake, linesFromIntake, type AiIntakeLine } from '@/hooks/useAiIntake';
import { generateCONumber } from '@/lib/generateCONumber';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { VoiceInputButton } from '@/components/VoiceInputButton';
import {
  Sparkles,
  ArrowLeft,
  Loader2,
  ClipboardPaste,
  Mic,
  Trash2,
  PencilLine,
  FileText,
  Wrench,
  Package,
  HardHat,

} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Centerpiece "Describe the change" intake — the single front door for
 * creating a Change Order or Work Order. Replaces the cold-start system/action
 * picker. Voice + paste + type are co-equal inputs. AI extracts scope into
 * confirmable chips. CO vs WO is a user-controlled toggle (defaulted from
 * project.contract_mode). "Edit details" escapes to the manual picker at
 * /change-orders/new/manual carrying the captured text as seed.
 */
export default function CONewIntakePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addToCoId = searchParams.get('coId');
  const autoStartVoice = searchParams.get('mode') === 'voice';
  const { user, userOrgRoles } = useAuth();
  const orgType = useOrgType();

  const [text, setText] = useState('');
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [lines, setLines] = useState<AiIntakeLine[]>([]);
  const [docType, setDocType] = useState<'CO' | 'WO' | null>(null);
  const [materialBy, setMaterialBy] = useState<'GC' | 'TC' | null>(null);
  const [equipmentBy, setEquipmentBy] = useState<'GC' | 'TC' | null>(null);

  const runIntake = useStartAiIntake();
  const intakeQuery = useAiIntake(intakeId);

  useEffect(() => {
    const row = intakeQuery.data as any;
    if (!row) return;
    if (row.status === 'succeeded' && lines.length === 0) {
      const parsed = linesFromIntake(row);
      setLines(parsed);
      if (parsed.length === 0) {
        toast({ title: 'No scope detected', description: 'Try adding more detail about what changed.' });
      }
    } else if (row.status === 'failed') {
      toast({ title: 'AI extraction failed', description: row.error_message ?? 'Unknown error', variant: 'destructive' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intakeQuery.data?.status]);

  const isProcessing =
    runIntake.isPending ||
    (intakeId !== null && lines.length === 0 && (intakeQuery.data as any)?.status !== 'failed');

  const { data: contractDefault } = useQuery({
    queryKey: ['co-intake-contract-default', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('project_contracts')
        .select('material_responsibility')
        .eq('project_id', projectId!)
        .not('material_responsibility', 'is', null)
        .limit(1)
        .maybeSingle();
      return (data?.material_responsibility as 'GC' | 'TC') ?? 'TC';
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!contractDefault) return;
    setMaterialBy((prev) => prev ?? contractDefault);
    setEquipmentBy((prev) => prev ?? contractDefault);
  }, [contractDefault]);

  const { data: existingCO } = useQuery({
    queryKey: ['co-intake-existing-co', projectId, addToCoId],
    enabled: !!projectId && !!addToCoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_orders')
        .select('id, document_type, co_number, title, status, co_material_responsible_override, co_equipment_responsible_override')
        .eq('id', addToCoId!)
        .eq('project_id', projectId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!existingCO) return;
    if (existingCO.co_material_responsible_override) {
      setMaterialBy(existingCO.co_material_responsible_override as 'GC' | 'TC');
    }
    if (existingCO.co_equipment_responsible_override) {
      setEquipmentBy(existingCO.co_equipment_responsible_override as 'GC' | 'TC');
    }
  }, [existingCO]);



  const { data: project } = useQuery({
    queryKey: ['project-min', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('name, contract_mode')
        .eq('id', projectId!)
        .maybeSingle();
      return data;
    },
  });

  // Default CO/WO toggle once the project loads (T&M → WO, else CO),
  // but let the user override it explicitly. When appending to an existing
  // CO/WO, lock the type to that document.
  useEffect(() => {
    if (docType !== null) return;
    if (existingCO?.document_type) {
      setDocType(existingCO.document_type as 'CO' | 'WO');
      return;
    }
    if (!project) return;
    setDocType(project.contract_mode === 'tm' ? 'WO' : 'CO');
  }, [project, existingCO, docType]);

  const finalize = useMutation({
    mutationFn: async () => {
      if (!projectId || !user || !intakeId || lines.length === 0) {
        throw new Error('Nothing to finalize');
      }
      const orgId = userOrgRoles[0]?.organization_id;
      if (!orgId) throw new Error('No org membership');

      const role: 'GC' | 'TC' | 'FC' = orgType.isGC ? 'GC' : orgType.isFC ? 'FC' : 'TC';
      const isWO = docType === 'WO';

      // Append to existing CO/WO when routed from the detail page.
      if (addToCoId) {
        const { data: maxSort, error: sortErr } = await supabase
          .from('co_line_items')
          .select('sort_order')
          .eq('co_id', addToCoId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sortErr) throw sortErr;

        const baseSort = (maxSort?.sort_order ?? -1) + 1;
        const lineRows = lines.map((l, idx) => ({
          co_id: addToCoId,
          org_id: orgId,
          created_by_role: role,
          item_name: l.title,
          unit: l.unit ?? 'EA',
          qty: l.qty ?? null,
          sort_order: baseSort + idx,
          description: l.problem || null,
          location_tag: l.location_hint,
          source: 'ai_split' as const,
          scenario_id: l.scenario_id,
          group_key: l.group_key,
        }));

        const { error: liErr } = await supabase.from('co_line_items').insert(lineRows);
        if (liErr) throw liErr;

        await supabase
          .from('co_ai_intakes')
          .update({ status: 'finalized', finalized_co_id: addToCoId })
          .eq('id', intakeId);

        return addToCoId;
      }

      const coNumber = await generateCONumber({
        projectId,
        creatorOrgId: orgId,
        assignedToOrgId: null,
        isTM: isWO,
      });

      const { data: co, error: coErr } = await supabase
        .from('change_orders')
        .insert({
          project_id: projectId,
          org_id: orgId,
          created_by_user_id: user.id,
          created_by_role: role,
          co_number: coNumber,
          title: lines[0]?.title?.slice(0, 80) ?? 'New change',
          status: 'draft',
          pricing_type: 'fixed',
          entry_source: 'ai_intake',
          ai_intake_id: intakeId,
          problem_summary: text.slice(0, 4000),
          document_type: isWO ? 'WO' : 'CO',
          co_material_responsible_override:
            materialBy && materialBy !== contractDefault ? materialBy : null,
          co_equipment_responsible_override:
            equipmentBy && equipmentBy !== contractDefault ? equipmentBy : null,

        })
        .select('id')
        .single();
      if (coErr) throw coErr;

      const lineRows = lines.map((l, idx) => ({
        co_id: co.id,
        org_id: orgId,
        created_by_role: role,
        item_name: l.title,
        unit: l.unit ?? 'EA',
        qty: l.qty ?? null,
        sort_order: idx,
        description: l.problem || null,
        location_tag: l.location_hint,
        source: 'ai_split' as const,
        scenario_id: l.scenario_id,
        group_key: l.group_key,
      }));

      const { error: liErr } = await supabase.from('co_line_items').insert(lineRows);
      if (liErr) throw liErr;

      await supabase
        .from('co_ai_intakes')
        .update({ status: 'finalized', finalized_co_id: co.id })
        .eq('id', intakeId);

      return co.id;
    },
    onSuccess: (coId) => {
      toast({
        title: addToCoId ? 'Items added' : `Draft ${docType ?? 'CO'} created`,
        description: addToCoId
          ? 'The scope items have been added to the existing order.'
          : 'Review and submit when ready.',
      });
      navigate(`/project/${projectId}/change-orders/${coId}`);
    },
    onError: (e: any) => {
      toast({
        title: 'Could not create draft',
        description: e?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  if (!projectId) return <Navigate to="/dashboard" replace />;

  const handleAnalyze = async () => {
    try {
      setLines([]);
      const res = await runIntake.mutateAsync({
        project_id: projectId,
        source_kind: 'paste',
        raw_text: text,
      });
      setIntakeId(res.intake_id);
      // Lines arrive via polling effect above.
    } catch (e: any) {
      toast({
        title: 'AI extraction failed',
        description: e?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const handleVoice = (transcript: string) => {
    setText((prev) => (prev ? `${prev}\n${transcript}` : transcript));
  };

  const handlePaste = async () => {
    try {
      const clip = await navigator.clipboard.readText();
      if (!clip) {
        toast({ title: 'Clipboard is empty' });
        return;
      }
      setText((prev) => (prev ? `${prev}\n${clip}` : clip));
    } catch {
      toast({
        title: 'Paste blocked',
        description: 'Your browser blocked clipboard access — paste manually with ⌘V.',
      });
    }
  };

  const goManual = () => {
    // Hand off the captured text to the manual picker as a seed.
    if (text.trim()) {
      try {
        sessionStorage.setItem(`co-intake-seed:${projectId}`, text);
      } catch {
        // ignore
      }
    }
    navigate(
      addToCoId
        ? `/project/${projectId}/change-orders/${addToCoId}/add-items`
        : `/project/${projectId}/change-orders/new/manual`,
    );
  };

  const charCount = text.length;
  const canAnalyze = text.trim().length >= 5 && !isProcessing;

  const docLabel = docType ?? 'CO';
  const inferredFromMode = useMemo(
    () => project?.contract_mode === 'tm' ? 'WO' : 'CO',
    [project],
  );

  const examplePrompts = [
    'Owner wants to move the kitchen wall 2ft east, main floor.',
    'Add 3 recessed lights in the primary bedroom ceiling.',
    'Re-frame the basement stair landing per RFI #14.',
  ];

  return (
    <div className="relative min-h-screen">
      {/* Soft ambient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-primary/[0.06] via-primary/[0.02] to-transparent"
      />

      <div className="relative mx-auto max-w-3xl px-4 pt-6 pb-32 sm:pt-10">
        <button
          onClick={() =>
            navigate(
              addToCoId
                ? `/project/${projectId}/change-orders/${addToCoId}`
                : `/project/${projectId}/change-orders`,
            )
          }
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> {addToCoId ? 'Back to order' : 'Back to Change Orders'}
        </button>

        {lines.length === 0 && (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-inset ring-primary/20">
                <Sparkles className="size-6 text-primary" />
              </div>
              <h1 className="font-heading text-5xl font-semibold uppercase tracking-tight text-foreground sm:text-6xl">
                {addToCoId && existingCO
                  ? 'What do you want to add?'
                  : docLabel === 'WO'
                    ? 'What are we working on?'
                    : 'What changed?'}
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                {addToCoId && existingCO
                  ? `Adding scope to ${existingCO.co_number || 'existing order'}. Just describe the new work and we'll turn it into line items.`
                  : docLabel === 'WO'
                    ? 'Describe the work — voice, paste, or type — and we\'ll turn it into a trackable work order.'
                    : `Just talk, paste an RFI, or type it out — we'll turn it into a clean,
                trackable change order.`}
              </p>
            </div>

            {/* Doc type pre-selector */}
            <div
              className={cn(
                'mb-5 flex items-center justify-center gap-1.5 rounded-full border border-border bg-card p-1 shadow-sm w-fit mx-auto',
                existingCO && 'opacity-70',
              )}
            >
              {(['CO', 'WO'] as const).map((t) => {
                const active = docLabel === t;
                return (
                  <button
                    key={t}
                    disabled={!!existingCO}
                    onClick={() => setDocType(t)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all',
                      active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                      existingCO && 'cursor-default',
                    )}
                  >
                    {t === 'CO' ? <FileText className="size-3.5" /> : <Wrench className="size-3.5" />}
                    {t === 'CO' ? 'Change Order' : 'Work Order'}
                    {inferredFromMode === t && !active && !existingCO && (
                      <span className="ml-1 size-1.5 rounded-full bg-amber-500" aria-label="suggested" />
                    )}
                  </button>
                );
              })}
            </div>

            <Card className="overflow-hidden rounded-2xl border-2 border-border/60 bg-card p-0 shadow-lg shadow-primary/[0.04] transition-shadow focus-within:border-primary/40 focus-within:shadow-xl focus-within:shadow-primary/[0.08]">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Describe what changed — voice, paste, or type…"
                className="min-h-[200px] resize-y border-0 bg-transparent px-6 py-5 text-base leading-relaxed shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
              />

              <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-3 py-2.5">
                <div className="flex items-center gap-1">
                  <VoiceInputButton
                    onTranscript={handleVoice}
                    size="md"
                    autoStart={autoStartVoice}
                    className="!bg-primary !text-primary-foreground shadow-sm hover:!bg-primary/90"
                  />
                  <Button variant="ghost" size="sm" onClick={handlePaste} className="h-8 gap-1.5 text-xs">
                    <ClipboardPaste className="size-3.5" />
                    Paste RFI
                  </Button>
                  <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                    {charCount > 0 ? `${charCount} chars` : 'hold mic · paste · type'}
                  </span>
                </div>

                <Button
                  onClick={handleAnalyze}
                  disabled={!canAnalyze}
                  size="sm"
                  className="h-8 gap-1.5 px-3"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      {runIntake.isPending ? 'Starting…' : 'Drafting…'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" /> Extract scope
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Click-to-fill examples */}
            {charCount === 0 && (
              <div className="mt-6">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Try an example
                </p>
                <div className="flex flex-col gap-1.5">
                  {examplePrompts.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setText(ex)}
                      className="group flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2 text-left text-sm text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/[0.03] hover:text-foreground"
                    >
                      <PencilLine className="size-3.5 shrink-0 text-muted-foreground/60 group-hover:text-primary" />
                      <span className="truncate">{ex}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-border/50 pt-4 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-2 font-mono uppercase tracking-wider">
                <Mic className="size-3" /> Voice
                <span className="opacity-40">/</span>
                <ClipboardPaste className="size-3" /> RFI
                <span className="opacity-40">/</span>
                <PencilLine className="size-3" /> Type
              </span>
              <button
                onClick={goManual}
                className="font-medium text-foreground/70 underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                Or build manually →
              </button>
            </div>
          </>
        )}


      {lines.length > 0 && (
        <>
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {addToCoId && existingCO ? `Adding to ${existingCO.co_number || 'existing order'}` : 'We heard'}
            </p>
            <h1 className="mt-1 font-heading text-2xl font-semibold">
              {lines.length} scope {lines.length === 1 ? 'item' : 'items'} extracted
            </h1>
          </div>

          {/* CO / WO toggle */}
          <Card className={cn('mb-4 rounded-2xl p-4', existingCO && 'opacity-70')}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {addToCoId && existingCO ? 'Order type' : 'Create as'}
            </p>
            <div className="flex gap-2">
              {(['CO', 'WO'] as const).map((t) => {
                const active = docLabel === t;
                return (
                  <button
                    key={t}
                    disabled={!!existingCO}
                    onClick={() => setDocType(t)}
                    className={cn(
                      'flex-1 rounded-xl border-2 p-3 text-left transition-all',
                      active
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/40',
                      existingCO && 'cursor-default',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {t === 'CO' ? (
                        <FileText className="size-4" />
                      ) : (
                        <Wrench className="size-4" />
                      )}
                      <span className="font-semibold">
                        {t === 'CO' ? 'Change Order' : 'Work Order'}
                      </span>
                      {inferredFromMode === t && !existingCO && (
                        <Badge variant="secondary" className="ml-auto text-[10px]">
                          Suggested
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t === 'CO'
                        ? 'Fixed-price change to the contract sum.'
                        : 'T&M work, tracked by hours and materials.'}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Material & Equipment responsibility — hide for FC */}
          {!orgType.isFC && (
            <Card className={cn('mb-4 rounded-2xl p-4', existingCO && 'opacity-70')}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Who provides what
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([
                  { key: 'mat', label: 'Materials', icon: Package, value: materialBy, set: setMaterialBy },
                  { key: 'eq', label: 'Equipment', icon: HardHat, value: equipmentBy, set: setEquipmentBy },
                ] as const).map(({ key, label, icon: Icon, value, set }) => (
                  <div key={key} className="rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                      <Icon className="size-3.5" /> {label}
                    </div>
                    <div className="flex gap-1.5">
                      {(['GC', 'TC'] as const).map((who) => {
                        const active = value === who;
                        return (
                          <button
                            key={who}
                            disabled={!!existingCO}
                            onClick={() => set(who)}
                            className={cn(
                              'flex-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all',
                              active
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground hover:border-muted-foreground/40',
                              existingCO && 'cursor-default',
                            )}
                          >
                            {who}
                            {contractDefault === who && (
                              <span className="ml-1 text-[10px] font-normal opacity-60">default</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {addToCoId && existingCO
                  ? 'Locked to the existing order\'s responsibility settings.'
                  : 'Pre-filled from the project contract. Override only if this change is different.'}
              </p>
            </Card>
          )}



          {/* Extracted lines */}
          <div className="space-y-3">
            {lines.map((l, idx) => (
              <Card key={idx} className="rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={l.title}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = { ...l, title: e.target.value };
                        setLines(next);
                      }}
                      className="font-medium"
                    />
                    <Textarea
                      value={l.problem}
                      onChange={(e) => {
                        const next = [...lines];
                        next[idx] = { ...l, problem: e.target.value };
                        setLines(next);
                      }}
                      className="min-h-[60px] text-sm"
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {l.catalog_name && (
                        <Badge variant="secondary">{l.catalog_name}</Badge>
                      )}
                      {l.location_hint && (
                        <Badge variant="outline">{l.location_hint}</Badge>
                      )}
                      <Badge variant="outline">
                        {l.qty ?? '—'} {l.unit ?? ''}
                      </Badge>
                      <span className="text-muted-foreground">
                        {(l.confidence * 100).toFixed(0)}% confidence
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLines(lines.filter((_, i) => i !== idx))}
                    aria-label="Remove line"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setLines([]);
                  setIntakeId(null);
                }}
              >
                ← Re-describe
              </Button>
              <Button variant="outline" onClick={goManual} className="gap-1.5">
                <PencilLine className="size-4" />
                Edit details manually
              </Button>
            </div>
            <Button
              onClick={() => finalize.mutate()}
              disabled={finalize.isPending || lines.length === 0 || !docType}
              className="gap-2"
            >
              {finalize.isPending && <Loader2 className="size-4 animate-spin" />}
              {addToCoId ? `Add to ${existingCO?.co_number || 'order'}` : `Create draft ${docLabel}`}
            </Button>
          </div>
        </>
      )}
      </div>
    </div>
  );
}
