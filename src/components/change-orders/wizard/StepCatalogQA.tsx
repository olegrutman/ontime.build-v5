import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Keyboard, Sparkles, Check, Pencil, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectScope } from '@/hooks/useProjectScope';
import { useScopeCatalog } from '@/hooks/useScopeCatalog';
import { useScopeSuggestions, type SuggestPick } from '@/hooks/useScopeSuggestions';
import { useQuestionFlow } from '@/hooks/useQuestionFlow';
import { resolveZoneFromLocationTag } from '@/lib/resolveZone';
import { FLOWS, resolveBuildingType, resolveScenario } from '@/lib/framingQuestionTrees';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { COReasonCode } from '@/types/changeOrder';
import type { SelectedScopeItem } from './COWizard';
import type { FlowContext } from '@/types/scopeQA';

interface StepCatalogQAProps {
  projectId: string;
  locationTag: string;
  reason: string;
  workType: string | null;
  projectName?: string;
  onComplete: (result: {
    description: string;
    answers: Record<string, string | string[]>;
    selectedItems: SelectedScopeItem[];
  }) => void;
  onFallbackToType: (draftText: string) => void;
  onFallbackToBrowse: () => void;
}

export function StepCatalogQA({
  projectId,
  locationTag,
  reason,
  workType,
  projectName,
  onComplete,
  onFallbackToType,
  onFallbackToBrowse,
}: StepCatalogQAProps) {
  const { data: scope } = useProjectScope(projectId);
  const { allItems } = useScopeCatalog();
  const suggestMutation = useScopeSuggestions();

  const buildingType = useMemo(
    () => resolveBuildingType(scope?.home_type ?? null, workType),
    [scope?.home_type, workType]
  );
  const scenario = useMemo(() => resolveScenario(reason), [reason]);
  const flow = FLOWS[buildingType]?.[scenario] ?? FLOWS.custom_home[scenario];
  const zone = useMemo(() => resolveZoneFromLocationTag(locationTag), [locationTag]);

  const ctx: FlowContext = useMemo(() => ({
    buildingType,
    framingMethod: scope?.framing_method ?? null,
    constructionType: scope?.construction_type ?? null,
    stories: scope?.stories ?? null,
    hasSharedWalls: !!scope?.has_shared_walls,
    locationTag,
    zone,
    reason,
    workType,
    projectName: projectName ?? '',
  }), [buildingType, scope, locationTag, zone, reason, workType, projectName]);

  const flowState = useQuestionFlow(flow, ctx);
  const [picks, setPicks] = useState<SuggestPick[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function runMatch() {
    flowState.finish();
    const description = flow.summarize(ctx, flowState.answers);
    try {
      const result = await suggestMutation.mutateAsync({
        project_id: projectId,
        description,
        location_tag: locationTag,
        zone,
        reason,
        work_type: workType,
        building_type: buildingType,
        framing_method: scope?.framing_method ?? null,
        answers: flowState.answers,
      });
      setPicks(result.picks);
    } catch (err) {
      console.error('Suggest failed:', err);
      setPicks([]);
    }
  }

  function togglePick(p: SuggestPick) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(p.catalog_id)) next.delete(p.catalog_id);
      else next.add(p.catalog_id);
      return next;
    });
  }

  function handleConfirm() {
    if (!picks) return;
    const items: SelectedScopeItem[] = picks
      .filter(p => selected.has(p.catalog_id))
      .map(p => {
        const cat = allItems.find(i => i.id === p.catalog_id);
        if (!cat) return null;
        return {
          ...cat,
          locationTag,
          reason: reason as COReasonCode,
          reasonDescription: '',
        } as SelectedScopeItem;
      })
      .filter((x): x is SelectedScopeItem => !!x);

    onComplete({
      description: flow.summarize(ctx, flowState.answers),
      answers: flowState.answers,
      selectedItems: items,
    });
  }

  function handleFallbackType() {
    const draft = flowState.isComplete
      ? flow.summarize(ctx, flowState.answers)
      : '';
    onFallbackToType(draft);
  }

  // ── HEADER ──
  const reasonColors = CO_REASON_COLORS[reason as COReasonCode];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Context pills */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 text-xs font-medium">
          <MapPin className="h-3 w-3" /> {locationTag || 'Location'}
        </div>
        {reasonColors && (
          <div
            className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: reasonColors.bg, color: reasonColors.text }}
          >
            {CO_REASON_LABELS[reason as COReasonCode] ?? reason}
          </div>
        )}
        {workType && (
          <div className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 text-xs font-semibold">
            {workType}
          </div>
        )}
        <div className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 text-xs font-semibold">
          {buildingType.replace('_', ' ')}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all"
          style={{
            width: `${
              picks
                ? 100
                : flowState.isComplete
                ? 90
                : Math.max(8, flowState.progress * 80)
            }%`,
          }}
        />
      </div>

      {/* Breadcrumb of past answers */}
      {Object.keys(flowState.answers).length > 0 && !picks && (
        <div className="flex flex-wrap gap-1.5">
          {flow.questions.slice(0, flowState.currentIdx).map(q => {
            const val = flowState.answers[q.id];
            if (!val) return null;
            const ans = q.answers.find(a => a.id === val);
            return (
              <button
                key={q.id}
                onClick={() => flowState.editAnswer(q.id)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs hover:bg-muted/70"
              >
                {ans?.label ?? String(val)}
                <Pencil className="h-2.5 w-2.5 opacity-60" />
              </button>
            );
          })}
        </div>
      )}

      {/* QUESTION CARD */}
      {!flowState.isComplete && !picks && flowState.currentQuestion && (
        <QuestionCard
          question={flowState.currentQuestion}
          questionIndex={flowState.currentIdx}
          totalQuestions={flowState.totalQuestions}
          onAnswer={(value) => flowState.answer(flowState.currentQuestion.id, value)}
        />
      )}

      {/* SUMMARY CARD (between flow finish and AI call) */}
      {flowState.isComplete && !picks && !suggestMutation.isPending && (
        <div className="rounded-lg border-2 border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm shrink-0">
              ✦
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                Sasha's read
              </p>
              <p className="mt-1 text-sm text-foreground leading-relaxed">
                {flow.summarize(ctx, flowState.answers)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-200/40">
            <Button onClick={runMatch} className="bg-amber-600 hover:bg-amber-700 text-white">
              <Sparkles className="h-4 w-4 mr-1.5" /> Match catalog items
            </Button>
            <Button variant="outline" size="sm" onClick={() => flowState.back()}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        </div>
      )}

      {/* LOADING STATE */}
      {suggestMutation.isPending && (
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-xl">
              ✦
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Sasha is matching…</p>
        </div>
      )}

      {/* PICKS RESULT */}
      {picks && (
        <div className="space-y-3">
          {picks.length === 0 ? (
            <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No automatic matches. Use the manual catalog or type a description.
            </div>
          ) : (
            picks.map(p => (
              <PickCard
                key={p.catalog_id}
                pick={p}
                selected={selected.has(p.catalog_id)}
                onToggle={() => togglePick(p)}
              />
            ))
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Continue with {selected.size} item{selected.size === 1 ? '' : 's'} →
            </Button>
            <Button variant="outline" size="sm" onClick={onFallbackToBrowse}>
              Show everything
            </Button>
          </div>
        </div>
      )}

      {/* ESCAPE ROW */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => flowState.back()} disabled={flowState.currentIdx === 0 && !picks}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button variant="ghost" size="sm" onClick={handleFallbackType}>
            <Keyboard className="h-4 w-4 mr-1" /> Type instead
          </Button>
        </div>
        {!flowState.isComplete && flowState.currentIdx >= 2 && !picks && (
          <Button variant="outline" size="sm" onClick={runMatch}>
            <Sparkles className="h-4 w-4 mr-1" /> I have enough — match now →
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
}: {
  question: import('@/types/scopeQA').ScopeQuestion;
  questionIndex: number;
  totalQuestions: number;
  onAnswer: (value: string) => void;
}) {
  const gridClass = (() => {
    switch (question.grid) {
      case 'cols-3': return 'grid-cols-2 sm:grid-cols-3';
      case 'cols-4': return 'grid-cols-2 sm:grid-cols-4';
      case 'cols-5': return 'grid-cols-2 sm:grid-cols-5';
      case 'cols-6': return 'grid-cols-2 sm:grid-cols-6';
      case 'scale': return 'grid-cols-3 sm:grid-cols-5';
      case 'multiselect': return 'grid-cols-2 sm:grid-cols-3';
      default: return 'grid-cols-2 sm:grid-cols-3';
    }
  })();

  return (
    <div className="relative rounded-lg border bg-card p-4 space-y-3">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-amber-400 rounded-t-lg" />

      <div className="flex items-start gap-3 pt-1">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white text-sm shrink-0">
          ✦
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Question {questionIndex + 1} of {totalQuestions}
          </p>
          <h3 className="font-bold text-foreground leading-tight" style={{ fontSize: '1.1rem' }}>
            {question.text}
          </h3>
          {question.hint && (
            <p className="mt-1 text-xs italic text-muted-foreground">{question.hint}</p>
          )}
        </div>
        {question.why && (
          <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400 text-[10px] font-semibold">
            {question.why}
          </span>
        )}
      </div>

      <div className={cn('grid gap-2', gridClass)}>
        {question.answers.map(a => (
          <button
            key={a.id}
            onClick={() => onAnswer(a.id)}
            className={cn(
              'relative flex flex-col items-center text-center gap-1 px-2 py-3 rounded-lg border-2 transition-all',
              'border-border hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-amber-950/10'
            )}
          >
            {a.spec && (
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-purple-500" aria-label="Specific to this building type" />
            )}
            {a.icon && <span className="text-lg leading-none">{a.icon}</span>}
            <span className="text-xs font-semibold text-foreground leading-tight">{a.label}</span>
            {a.sub && <span className="text-[10px] text-muted-foreground leading-tight">{a.sub}</span>}
          </button>
        ))}
      </div>

      {question.annotation && (
        <div
          className="rounded-md border-l-2 border-purple-500 bg-purple-50/50 dark:bg-purple-950/10 p-2.5 text-xs text-foreground/80"
          dangerouslySetInnerHTML={{ __html: question.annotation }}
        />
      )}
    </div>
  );
}

function PickCard({
  pick,
  selected,
  onToggle,
}: {
  pick: SuggestPick;
  selected: boolean;
  onToggle: () => void;
}) {
  const ringPct = Math.round(pick.confidence * 100);
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full text-left rounded-lg border-2 p-3 transition-all',
        selected
          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20'
          : 'border-border hover:border-amber-300'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-10 w-10 shrink-0">
          <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
            <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
            <circle
              cx="18" cy="18" r="15"
              fill="none" stroke="currentColor" strokeWidth="3"
              strokeDasharray={`${(ringPct / 100) * 94.25} 94.25`}
              className="text-amber-500"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
            {ringPct}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{pick.name}</p>
            {pick.suggested_quantity != null && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                AI · {pick.suggested_quantity} {pick.unit}
              </span>
            )}
          </div>
          {pick.reasoning && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{pick.reasoning}</p>
          )}
        </div>
        {selected && <Check className="h-4 w-4 text-amber-600 shrink-0 mt-1" />}
      </div>
    </button>
  );
}
