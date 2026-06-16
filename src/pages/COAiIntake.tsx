import { useState } from 'react';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCoV4Flag } from '@/hooks/useCoV4Flag';
import { useRunAiIntake, type AiIntakeLine } from '@/hooks/useAiIntake';
import { useOrgType } from '@/hooks/useOrgType';
import { generateCONumber } from '@/lib/generateCONumber';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowLeft, Trash2, Loader2 } from 'lucide-react';

/**
 * CO v4 — Standalone AI intake page.
 *
 * GC pastes messy owner/architect text → AI proposes line items →
 * GC reviews + edits → "Create CO" produces a draft CO with `entry_source='ai_intake'`
 * and `co_line_items` rows with `source='ai_split'`, then routes to the existing CODetail.
 *
 * Gated by the org-scoped `co_v4` feature flag. If the flag is off, the route is
 * silently redirected to the existing picker-v3 flow so this never appears for
 * orgs that haven't opted in.
 */
export default function COAiIntakePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, userOrgRoles } = useAuth();
  const orgType = useOrgType();
  const flagEnabled = useCoV4Flag();

  const [text, setText] = useState('');
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [lines, setLines] = useState<AiIntakeLine[]>([]);

  const runIntake = useRunAiIntake();

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

  const finalize = useMutation({
    mutationFn: async () => {
      if (!projectId || !user || !intakeId || lines.length === 0) {
        throw new Error('Nothing to finalize');
      }
      const orgId = userOrgRoles[0]?.organization_id;
      if (!orgId) throw new Error('No org membership');

      const role: 'GC' | 'TC' | 'FC' = orgType.isGC ? 'GC' : orgType.isFC ? 'FC' : 'TC';
      const isTM = project?.contract_mode === 'tm';

      const coNumber = await generateCONumber({
        projectId,
        creatorOrgId: orgId,
        assignedToOrgId: null,
        isTM,
      });

      const { data: co, error: coErr } = await supabase
        .from('change_orders')
        .insert({
          project_id: projectId,
          org_id: orgId,
          created_by_user_id: user.id,
          created_by_role: role,
          co_number: coNumber,
          title: lines[0]?.title?.slice(0, 80) ?? 'AI-drafted change order',
          status: 'draft',
          pricing_type: 'fixed',
          entry_source: 'ai_intake',
          ai_intake_id: intakeId,
          problem_summary: text.slice(0, 4000),
          document_type: isTM ? 'WO' : 'CO',
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

      // Link intake → CO
      await supabase
        .from('co_ai_intakes')
        .update({ status: 'finalized', finalized_co_id: co.id })
        .eq('id', intakeId);

      return co.id;
    },
    onSuccess: (coId) => {
      toast({ title: 'Draft CO created', description: 'Review and submit when ready.' });
      navigate(`/project/${projectId}/change-orders/${coId}`);
    },
    onError: (e: any) => {
      toast({ title: 'Could not finalize', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    },
  });

  if (!projectId) return <Navigate to="/dashboard" replace />;
  if (!flagEnabled) {
    return <Navigate to={`/project/${projectId}/change-orders/new`} replace />;
  }

  const handleAnalyze = async () => {
    try {
      const res = await runIntake.mutateAsync({
        project_id: projectId,
        source_kind: 'paste',
        raw_text: text,
      });
      setIntakeId(res.intake_id);
      setLines(res.lines);
      if (res.lines.length === 0) {
        toast({ title: 'No scope detected', description: 'Try adding more detail about the change.' });
      }
    } catch (e: any) {
      toast({ title: 'AI intake failed', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        onClick={() => navigate(`/project/${projectId}/change-orders`)}
        className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Change Orders
      </button>

      <div className="mb-6">
        <h1 className="font-heading text-3xl font-semibold">AI Intake</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste the owner/architect request. We'll split it into reviewable line items you can edit before the TC sees them.
        </p>
      </div>

      {lines.length === 0 && (
        <Card className="rounded-2xl p-5">
          <label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Source text
          </label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste the request as you received it. Quotes, emails, transcripts — anything."
            className="mt-2 min-h-[200px]"
          />
          <div className="mt-4 flex items-center justify-end">
            <Button
              onClick={handleAnalyze}
              disabled={text.trim().length < 5 || runIntake.isPending}
              className="gap-2"
            >
              {runIntake.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              Analyze
            </Button>
          </div>
        </Card>
      )}

      {lines.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-heading text-xl font-semibold">Proposed lines ({lines.length})</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setLines([]); setIntakeId(null); }}
            >
              Re-analyze
            </Button>
          </div>

          <div className="space-y-3">
            {lines.map((l, idx) => (
              <Card key={idx} className="rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <Input
                      value={l.title}
                      onChange={(e) => {
                        const next = [...lines]; next[idx] = { ...l, title: e.target.value }; setLines(next);
                      }}
                      className="font-medium"
                    />
                    <Textarea
                      value={l.problem}
                      onChange={(e) => {
                        const next = [...lines]; next[idx] = { ...l, problem: e.target.value }; setLines(next);
                      }}
                      className="text-sm min-h-[60px]"
                    />
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {l.catalog_name && <Badge variant="secondary">{l.catalog_name}</Badge>}
                      {l.location_hint && <Badge variant="outline">{l.location_hint}</Badge>}
                      <Badge variant="outline">
                        {l.qty ?? '—'} {l.unit ?? ''}
                      </Badge>
                      <span className="text-muted-foreground">
                        confidence {(l.confidence * 100).toFixed(0)}%
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

          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => { setLines([]); setIntakeId(null); setText(''); }}
            >
              Cancel
            </Button>
            <Button onClick={() => finalize.mutate()} disabled={finalize.isPending || lines.length === 0}>
              {finalize.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create draft CO
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
