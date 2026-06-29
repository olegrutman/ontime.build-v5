import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCoV4Flag } from '@/hooks/useCoV4Flag';
import { generateCONumber } from '@/lib/generateCONumber';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { VisualLocationPicker } from '@/components/change-orders/VisualLocationPicker';
import { getLocationContract, autoFillLocationTag } from '@/lib/scenarioLocationRules';
import type { COCreatedByRole } from '@/types/changeOrder';

type Step = 1 | 2 | 3 | 4 | 5;

interface Scenario {
  id: string;
  name: string;
  description: string | null;
  system_tag: string | null;
  project_types: string[] | null;
  problem_tags: string[] | null;
  default_unit: string | null;
  component_lock: string | null;
  io_lock: string | null;
  level_constraint: string | null;
  area_required: boolean | null;
  auto_fill_location: boolean | null;
}
interface ScenarioLine {
  id: string;
  scenario_id: string;
  line_no: number;
  description: string;
  default_unit: string | null;
  notes: string | null;
}

const STEP_LABELS = ['Problem', 'System', 'Where', 'Fix', 'Review'] as const;

// Location contract is now derived from co_scenarios metadata via
// getLocationContract() in @/lib/scenarioLocationRules. The hardcoded
// system→component / inside-outside maps that used to live here are
// replaced by per-scenario fields (component_lock, io_lock,
// level_constraint, area_required, auto_fill_location).

export default function COGuidedBuilder() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, userOrgRoles } = useAuth();
  const v4 = useCoV4Flag();

  const [step, setStep] = useState<Step>(1);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [selectedLines, setSelectedLines] = useState<Set<string>>(new Set());
  const [location, setLocation] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Resolve participant + project
  const { data: myParticipant } = useQuery({
    queryKey: ['guided-participant', projectId],
    enabled: !!projectId && !!userOrgRoles?.length,
    queryFn: async () => {
      const orgId = userOrgRoles?.[0]?.organization_id;
      if (!orgId) return null;
      const { data } = await supabase
        .from('project_participants')
        .select('role, organization_id')
        .eq('project_id', projectId!)
        .eq('organization_id', orgId)
        .eq('invite_status', 'ACCEPTED')
        .maybeSingle();
      return data;
    },
  });

  const { data: project } = useQuery({
    queryKey: ['guided-project', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, project_type, contract_mode')
        .eq('id', projectId!)
        .maybeSingle();
      return data;
    },
  });

  // Scenarios filtered by project type if available
  const { data: scenarios = [], isLoading: scenariosLoading } = useQuery({
    queryKey: ['co-scenarios', project?.project_type ?? null],
    queryFn: async () => {
      const q = supabase
        .from('co_scenarios')
        .select('id, name, description, system_tag, project_types, problem_tags, default_unit, component_lock, io_lock, level_constraint, area_required, auto_fill_location')
        .order('system_tag', { ascending: true })
        .order('name', { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Scenario[];
    },
  });

  const filteredScenarios = useMemo(() => {
    if (!project?.project_type) return scenarios;
    return scenarios.filter(
      (s) => !s.project_types || s.project_types.length === 0 || s.project_types.includes(project.project_type!),
    );
  }, [scenarios, project?.project_type]);

  const scenario = useMemo(
    () => filteredScenarios.find((s) => s.id === scenarioId) ?? scenarios.find((s) => s.id === scenarioId) ?? null,
    [filteredScenarios, scenarios, scenarioId],
  );

  const { data: scenarioLines = [] } = useQuery({
    queryKey: ['co-scenario-lines', scenarioId],
    enabled: !!scenarioId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('co_scenario_lines')
        .select('id, scenario_id, line_no, description, default_unit, notes')
        .eq('scenario_id', scenarioId!)
        .order('line_no', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ScenarioLine[];
    },
  });

  // Auto-select all lines when scenario changes.
  // Key by joined ids — useQuery returns a fresh `[]` fallback on each render,
  // so depending on the array ref directly caused an infinite setState loop.
  const scenarioLineIdsKey = useMemo(
    () => scenarioLines.map((l) => l.id).join('|'),
    [scenarioLines],
  );
  useEffect(() => {
    setSelectedLines(new Set(scenarioLineIdsKey ? scenarioLineIdsKey.split('|') : []));
  }, [scenarioLineIdsKey]);

  const role: COCreatedByRole =
    myParticipant?.role === 'GC' ? 'GC' : myParticipant?.role === 'FC' ? 'FC' : 'TC';
  const orgId = (myParticipant?.organization_id ?? userOrgRoles?.[0]?.organization_id) as string | undefined;

  const groupedScenarios = useMemo(() => {
    // Construction sequence — walls first (most critical structural),
    // then follow rough → exterior envelope → finishes order.
    const SYSTEM_ORDER = [
      'Walls',
      'Floor / ceiling system',
      'Roof trusses',
      'Stairs',
      'Hardware / steel',
      'Fascia / soffit',
      'Siding',
      'Windows / patio doors',
      'Balcony / deck',
      'Drop ceiling',
      'Decorative woodwork',
    ];
    const rank = (key: string) => {
      const i = SYSTEM_ORDER.indexOf(key);
      return i === -1 ? SYSTEM_ORDER.length + 1 : i;
    };
    const groups = new Map<string, Scenario[]>();
    for (const s of filteredScenarios) {
      const key = s.system_tag ?? 'Other';
      const arr = groups.get(key) ?? [];
      arr.push(s);
      groups.set(key, arr);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const r = rank(a[0]) - rank(b[0]);
      return r !== 0 ? r : a[0].localeCompare(b[0]);
    });
  }, [filteredScenarios]);

  const canNext: Record<Step, boolean> = {
    1: !!scenarioId,
    2: !!scenario?.system_tag,
    3: location.trim().length > 0,
    4: selectedLines.size > 0,
    5: true,
  };

  const goNext = async () => {
    if (!canNext[step]) return;
    if (step === 4) {
      await generateSummary();
    }
    setStep((s) => (Math.min(5, s + 1) as Step));
  };
  const goBack = () => setStep((s) => (Math.max(1, s - 1) as Step));

  const generateSummary = async () => {
    if (!scenario) return;
    setSummaryLoading(true);
    try {
      const lines = scenarioLines.filter((l) => selectedLines.has(l.id)).map((l) => l.description);
      const { data, error } = await supabase.functions.invoke('co-guided-summary', {
        body: {
          problem: scenario.name,
          system: scenario.system_tag ?? 'General',
          location,
          lines,
          project_name: project?.name ?? null,
        },
      });
      if (error) throw error;
      setSummary((data as { summary?: string })?.summary ?? '');
    } catch (e) {
      console.error('summary error', e);
      toast.error('Could not generate AI summary — you can edit manually.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !orgId || !scenario || submitting) return;
    setSubmitting(true);
    try {
      const isTM = project?.contract_mode === 'tm';

      // Resolve upstream/downstream assignment
      let assignedToOrgId: string | null = null;
      if (role === 'FC') {
        const { data: up } = await supabase
          .from('project_contracts')
          .select('from_org_id')
          .eq('project_id', projectId)
          .eq('to_org_id', orgId)
          .maybeSingle();
        assignedToOrgId = up?.from_org_id ?? null;
      } else if (role === 'TC') {
        const { data: gc } = await supabase
          .from('project_participants')
          .select('organization_id')
          .eq('project_id', projectId)
          .eq('role', 'GC')
          .eq('invite_status', 'ACCEPTED')
          .maybeSingle();
        assignedToOrgId = gc?.organization_id ?? null;
      }

      const coNumber = await generateCONumber({
        projectId,
        creatorOrgId: orgId,
        assignedToOrgId,
        isTM,
      });

      const title = scenario.name.substring(0, 120);
      const { data: co, error: coErr } = await supabase
        .from('change_orders')
        .insert({
          org_id: orgId,
          project_id: projectId,
          created_by_user_id: user.id,
          created_by_role: role,
          co_number: coNumber,
          title,
          status: 'draft',
          document_type: isTM ? 'WO' : 'CO',
          reason: 'owner_request',
          reason_note: scenario.name,
          location_tag: location || null,
          assigned_to_org_id: assignedToOrgId,
          entry_source: 'guided_v4',
          problem_summary: summary || null,
        })
        .select('id')
        .single();
      if (coErr) throw coErr;

      const chosen = scenarioLines.filter((l) => selectedLines.has(l.id));
      if (chosen.length > 0) {
        const rows = chosen.map((l, idx) => ({
          co_id: co.id,
          org_id: orgId,
          created_by_role: role,
          item_name: l.description.substring(0, 120),
          description: l.notes ?? null,
          unit: l.default_unit ?? scenario.default_unit ?? 'EA',
          qty: 0,
          sort_order: idx + 1,
          location_tag: location || null,
          source: 'guided_v4' as const,
        }));
        const { error: liErr } = await supabase.from('co_line_items').insert(rows);
        if (liErr) console.error('line items insert', liErr);
      }

      await supabase.from('co_activity').insert({
        co_id: co.id,
        project_id: projectId,
        actor_user_id: user.id,
        actor_role: role,
        action: 'created',
        detail: `Created via Guided Builder · ${scenario.name}`,
      });

      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
      toast.success('Draft created — add pricing on the detail page.');
      navigate(`/project/${projectId}/change-orders/${co.id}`, { replace: true });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? 'Failed to create draft');
    } finally {
      setSubmitting(false);
    }
  };

  if (!projectId) return <Navigate to="/dashboard" replace />;
  if (!v4) {
    return <Navigate to={`/project/${projectId}/change-orders/new`} replace />;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/project/${projectId}/change-orders`)}
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold">
              Guided Change Order · v4
            </div>
            <h1 className="font-heading text-xl font-extrabold truncate">
              {project?.name ?? 'Project'}
            </h1>
          </div>
          <Badge variant="secondary" className="hidden sm:flex">
            Step {step} of 5 · {STEP_LABELS[step - 1]}
          </Badge>
        </div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-3 flex gap-1.5">
          {STEP_LABELS.map((label, i) => {
            const n = (i + 1) as Step;
            const done = n < step;
            const active = n === step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => n < step && setStep(n)}
                className={`flex-1 h-1.5 rounded-full transition-colors ${
                  done || active ? 'bg-[hsl(var(--navy))]' : 'bg-muted'
                }`}
                aria-label={`Step ${n}: ${label}`}
              />
            );
          })}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
        {/* Step 1: Problem */}
        {step === 1 && (
          <Card className="p-5 rounded-2xl">
            <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Step 1 · Problem
            </div>
            <h2 className="font-heading text-2xl font-extrabold mb-4">What happened?</h2>
            {scenariosLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading scenarios…
              </div>
            ) : groupedScenarios.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scenarios available yet.</p>
            ) : (
              <div className="space-y-5">
                {groupedScenarios.map(([system, list]) => (
                  <div key={system}>
                    <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      {system}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {list.map((s) => {
                        const active = scenarioId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setScenarioId(s.id)}
                            className={`text-left p-3 rounded-xl border transition-all ${
                              active
                                ? 'border-[hsl(var(--navy))] bg-amber-50/40 shadow-sm'
                                : 'border-border hover:border-muted-foreground/40 bg-background'
                            }`}
                          >
                            <div className="font-semibold text-sm">{s.name}</div>
                            {s.problem_tags && s.problem_tags.length > 0 && (
                              <div className="mt-1.5 flex gap-1 flex-wrap">
                                {s.problem_tags.slice(0, 3).map((t) => (
                                  <span
                                    key={t}
                                    className="text-[0.65rem] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Step 2: System (confirm) */}
        {step === 2 && scenario && (
          <Card className="p-5 rounded-2xl">
            <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Step 2 · System
            </div>
            <h2 className="font-heading text-2xl font-extrabold mb-4">
              Confirm the affected system
            </h2>
            <div className="p-4 rounded-xl border bg-amber-50/30">
              <div className="text-xs text-muted-foreground">System tag</div>
              <div className="font-heading text-xl font-bold">{scenario.system_tag ?? '—'}</div>
              <div className="mt-3 text-xs text-muted-foreground">Selected problem</div>
              <div className="font-semibold">{scenario.name}</div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              This is auto-derived from your scenario. We use it to filter where the work lands
              and how it&apos;s billed.
            </p>
          </Card>
        )}

        {/* Step 3: Where */}
        {step === 3 && (() => {
          const contract = getLocationContract(scenario);
          const auto = scenario ? autoFillLocationTag(contract, scenario) : null;
          // Auto-fill when the scenario is unambiguous and the user hasn't picked yet.
          if (auto && !location) {
            setTimeout(() => setLocation(auto), 0);
          }
          return (
            <Card className="p-5 rounded-2xl">
              <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Step 3 · Where
              </div>
              <h2 className="font-heading text-2xl font-extrabold mb-2">Where in the project?</h2>
              {auto ? (
                <>
                  <p className="text-sm text-muted-foreground mb-3">
                    This scenario only applies to one location. We&apos;ve filled it in for you — change it
                    only if you&apos;re working somewhere different.
                  </p>
                  <div className="mb-4 p-3 rounded-lg bg-secondary/15 border border-secondary/30 text-sm flex items-center justify-between">
                    <div>
                      <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-semibold">
                        Auto-detected location
                      </div>
                      <div className="font-semibold mt-0.5">{location || auto}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setLocation('')}>Edit</Button>
                  </div>
                </>
              ) : (
                <VisualLocationPicker
                  projectId={projectId}
                  savedLocation={location || null}
                  onConfirm={(tag) => setLocation(tag)}
                  lockedComponent={contract.componentLock}
                  lockedInsideOutside={contract.ioLock}
                  levelConstraint={contract.levelConstraint}
                />
              )}
              {location && !auto && (
                <div className="mt-4 p-3 rounded-lg bg-muted text-sm">
                  <span className="text-muted-foreground">Selected:</span>{' '}
                  <span className="font-semibold">{location}</span>
                </div>
              )}
            </Card>
          );
        })()}

        {/* Step 4: Fix */}
        {step === 4 && scenario && (
          <Card className="p-5 rounded-2xl">
            <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
              Step 4 · Fix
            </div>
            <h2 className="font-heading text-2xl font-extrabold mb-4">
              Choose the scope items to perform
            </h2>
            {scenarioLines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suggested lines for this scenario.</p>
            ) : (
              <div className="space-y-2">
                {scenarioLines.map((l) => {
                  const active = selectedLines.has(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() =>
                        setSelectedLines((prev) => {
                          const next = new Set(prev);
                          if (next.has(l.id)) next.delete(l.id);
                          else next.add(l.id);
                          return next;
                        })
                      }
                      className={`w-full text-left p-3 rounded-xl border flex items-start gap-3 transition-all ${
                        active
                          ? 'border-[hsl(var(--navy))] bg-amber-50/40'
                          : 'border-border bg-background hover:border-muted-foreground/40'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 shrink-0 ${
                          active
                            ? 'bg-[hsl(var(--navy))] border-[hsl(var(--navy))] text-white'
                            : 'border-muted-foreground/40'
                        }`}
                      >
                        {active && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{l.description}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Unit: {l.default_unit ?? scenario.default_unit ?? 'EA'}
                          {l.notes ? ` · ${l.notes}` : ''}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Pricing (qty, labor, materials, markup) is added on the CO detail page after creation.
            </p>
          </Card>
        )}

        {/* Step 5: Review */}
        {step === 5 && scenario && (
          <Card className="p-5 rounded-2xl space-y-4">
            <div>
              <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                Step 5 · Review
              </div>
              <h2 className="font-heading text-2xl font-extrabold">Review and create draft</h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-background">
                <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold">
                  Problem
                </div>
                <div className="font-semibold text-sm mt-0.5">{scenario.name}</div>
              </div>
              <div className="p-3 rounded-lg border bg-background">
                <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold">
                  System
                </div>
                <div className="font-semibold text-sm mt-0.5">{scenario.system_tag ?? '—'}</div>
              </div>
              <div className="p-3 rounded-lg border bg-background sm:col-span-2">
                <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold">
                  Location
                </div>
                <div className="font-semibold text-sm mt-0.5">{location || '—'}</div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" /> AI Summary
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateSummary}
                  disabled={summaryLoading}
                >
                  {summaryLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Regenerate'
                  )}
                </Button>
              </div>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={summaryLoading ? 'Generating…' : 'A 1-3 sentence scope description.'}
                rows={4}
                className="font-mono text-sm"
              />
            </div>

            <div>
              <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Scope items ({selectedLines.size})
              </div>
              <ul className="text-sm space-y-1">
                {scenarioLines
                  .filter((l) => selectedLines.has(l.id))
                  .map((l) => (
                    <li key={l.id} className="flex gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{l.description}</span>
                    </li>
                  ))}
              </ul>
            </div>
          </Card>
        )}

        {/* Spacer so content isn't hidden behind the floating bar */}
        <div className="h-20" aria-hidden />
      </main>

      {/* Floating bottom action bar — always visible, no scroll required */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={goBack} disabled={step === 1 || submitting}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>
          <div className="text-xs text-muted-foreground hidden sm:block">
            Step {step} of 5 · {STEP_LABELS[step - 1]}
          </div>
          {step < 5 ? (
            <Button onClick={goNext} disabled={!canNext[step]} className="min-w-[120px]">
              Next <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="min-w-[180px]">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>Create Draft <ArrowRight className="h-4 w-4 ml-1.5" /></>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
