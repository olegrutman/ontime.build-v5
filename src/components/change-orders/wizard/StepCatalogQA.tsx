import { useMemo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Keyboard, Sparkles, Check, Pencil, MapPin, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectScope } from '@/hooks/useProjectScope';
import { useScopeCatalog } from '@/hooks/useScopeCatalog';
import { useScopeSuggestions, type SuggestPick, type SuggestResponse } from '@/hooks/useScopeSuggestions';
import { useQuestionFlow } from '@/hooks/useQuestionFlow';
import { resolveZoneFromLocationTag } from '@/lib/resolveZone';
import { FLOWS, resolveBuildingType, resolveScenario } from '@/lib/framingQuestionTrees';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { COReasonCode } from '@/types/changeOrder';
import type { SelectedScopeItem } from './COWizard';
import type { FlowContext } from '@/types/scopeQA';
import { QuantityEditPopover } from './QuantityEditPopover';
import { LocationRefinementBanner } from './LocationRefinementBanner';

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
  /** Phase 4: when user accepts a refinement, parent updates locationTag */
  onLocationRefine?: (newTag: string) => void;
}

interface PickState extends SuggestPick {
  edited_qty?: number | null;
  edited_source?: 'ai' | 'manual';
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
  onLocationRefine,
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
  const [picks, setPicks] = useState<PickState[] | null>(null);
  const [extracted, setExtracted] = useState<SuggestResponse['extracted']>(null);
  const [refinementDismissed, setRefinementDismissed] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showMaybe, setShowMaybe] = useState(false);

  const runMatch = useCallback(async () => {
    if (!flowState.isComplete) flowState.finish();
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
      setPicks(result.picks.map((p) => ({ ...p })));
      setExtracted(result.extracted ?? null);
      setRefinementDismissed(false);
      // Auto-pre-check Strong matches (≥0.75 confidence) for one-tap continue
      const strong = new Set(result.picks.filter(p => p.confidence >= 0.75).map(p => p.catalog_id));
      setSelected(strong);
    } catch (err) {
      console.error('Suggest failed:', err);
      setPicks([]);
      setExtracted(null);
    }
  }, [flowState, flow, ctx, suggestMutation, projectId, locationTag, zone, reason, workType, buildingType, scope]);

  // Confidence tier helper
  function tierOf(conf: number): 'strong' | 'likely' | 'maybe' {
    if (conf >= 0.75) return 'strong';
    if (conf >= 0.5) return 'likely';
    return 'maybe';
  }

  function togglePick(p: PickState) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(p.catalog_id)) next.delete(p.catalog_id);
      else next.add(p.catalog_id);
      return next;
    });
  }

  function updatePickQty(catalogId: string, qty: number | null, source: 'ai' | 'manual') {
    setPicks(prev => prev?.map(p => p.catalog_id === catalogId ? { ...p, edited_qty: qty, edited_source: source } : p) ?? null);
  }

  function handleConfirm() {
    if (!picks) return;
    const items: SelectedScopeItem[] = picks
      .filter(p => selected.has(p.catalog_id))
      .map(p => {
        const cat = allItems.find(i => i.id === p.catalog_id);
        if (!cat) return null;
        const qty = p.edited_qty !== undefined ? p.edited_qty : p.suggested_quantity;
        const source: 'ai' | 'manual' | null = p.edited_source
          ? p.edited_source
          : qty != null ? 'ai' : null;
        return {
          ...cat,
          qty,
          quantity_source: source,
          ai_confidence: source === 'ai' ? p.confidence : null,
          ai_reasoning: source === 'ai' ? p.reasoning : null,
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

  function handleAcceptRefinement() {
    if (!extracted?.zone_refinement || !onLocationRefine) return;
    const newTag = extracted.zone_refinement;
    setRefinementDismissed(true);
    onLocationRefine(newTag);
    // Re-run match against new location once parent has updated.
    // We rely on a microtask: parent props flip locationTag → next runMatch uses it.
    setTimeout(() => { void runMatch(); }, 50);
  }

  // ── HEADER ──
  const reasonColors = CO_REASON_COLORS[reason as COReasonCode];
  const showRefinementBanner =
    !!picks &&
    !!extracted?.zone_refinement &&
    !refinementDismissed &&
    extracted.zone_refinement.toLowerCase() !== (locationTag || '').toLowerCase();

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
            const isSkip = val === '__skip__';
            const ans = q.answers.find(a => a.id === val);
            const label = isSkip ? 'Skipped' : (ans?.label ?? String(val));
            return (
              <button
                key={q.id}
                onClick={() => flowState.editAnswer(q.id)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs max-w-[160px] hover:bg-muted/70',
                  isSkip ? 'bg-muted/40 text-muted-foreground italic' : 'bg-muted text-foreground'
                )}
                title={label}
              >
                <span className="truncate">{label}</span>
                <Pencil className="h-2.5 w-2.5 opacity-60 shrink-0" />
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
      {picks && !suggestMutation.isPending && (
        <div className="space-y-3">
          {showRefinementBanner && extracted?.zone_refinement && (
            <LocationRefinementBanner
              currentTag={locationTag}
              refinement={extracted.zone_refinement}
              onUpdate={handleAcceptRefinement}
              onDismiss={() => setRefinementDismissed(true)}
            />
          )}

          {picks.length === 0 ? (
            <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No automatic matches. Use the manual catalog or type a description.
            </div>
          ) : (() => {
            const strong = picks.filter(p => tierOf(p.confidence) === 'strong');
            const likely = picks.filter(p => tierOf(p.confidence) === 'likely');
            const maybe  = picks.filter(p => tierOf(p.confidence) === 'maybe');
            const renderGroup = (label: string, color: string, items: PickState[]) => (
              items.length > 0 && (
                <div className="space-y-1.5">
                  <p className={cn('text-[10px] font-bold uppercase tracking-wide', color)}>
                    {label} <span className="opacity-60 font-medium">· {items.length}</span>
                  </p>
                  <div className="space-y-2">
                    {items.map(p => (
                      <PickCard
                        key={p.catalog_id}
                        pick={p}
                        tier={tierOf(p.confidence)}
                        selected={selected.has(p.catalog_id)}
                        onToggle={() => togglePick(p)}
                        onQtyChange={(qty, src) => updatePickQty(p.catalog_id, qty, src)}
                      />
                    ))}
                  </div>
                </div>
              )
            );
            return (
              <div className="space-y-4">
                {renderGroup('Strong match', 'text-emerald-700 dark:text-emerald-400', strong)}
                {renderGroup('Likely match', 'text-amber-700 dark:text-amber-400', likely)}
                {maybe.length > 0 && (
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setShowMaybe(v => !v)}
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDown className={cn('h-3 w-3 transition-transform', !showMaybe && '-rotate-90')} />
                      {showMaybe ? 'Hide' : 'Show'} {maybe.length} more suggestion{maybe.length === 1 ? '' : 's'}
                    </button>
                    {showMaybe && (
                      <div className="space-y-2">
                        {maybe.map(p => (
                          <PickCard
                            key={p.catalog_id}
                            pick={p}
                            tier="maybe"
                            selected={selected.has(p.catalog_id)}
                            onToggle={() => togglePick(p)}
                            onQtyChange={(qty, src) => updatePickQty(p.catalog_id, qty, src)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

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

      {/* Universal escape: "Not sure" — records '__skip__' and continues */}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={() => onAnswer('__skip__')}
          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          Not sure / Skip this
        </button>
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
  onQtyChange,
}: {
  pick: PickState;
  selected: boolean;
  onToggle: () => void;
  onQtyChange: (qty: number | null, source: 'ai' | 'manual') => void;
}) {
  const ringPct = Math.round(pick.confidence * 100);
  const currentQty = pick.edited_qty !== undefined ? pick.edited_qty : pick.suggested_quantity;
  const currentSource: 'ai' | 'manual' | null = pick.edited_source
    ? pick.edited_source
    : currentQty != null ? 'ai' : null;

  return (
    <div
      className={cn(
        'w-full rounded-lg border-2 transition-all',
        selected
          ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20'
          : 'border-border hover:border-amber-300'
      )}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Confidence ring — also toggles selection */}
        <button onClick={onToggle} className="relative h-10 w-10 shrink-0" aria-label="Toggle pick">
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
        </button>

        {/* Name + reasoning — toggles selection */}
        <button onClick={onToggle} className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{pick.name}</p>
          </div>
          {pick.reasoning && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{pick.reasoning}</p>
          )}
        </button>

        {selected && <Check className="h-4 w-4 text-amber-600 shrink-0 mt-1" />}
      </div>

      {/* Quantity row — sibling, NOT nested inside a button */}
      <div className="px-3 pb-3 -mt-1 flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Qty</span>
        <QuantityEditPopover
          value={currentQty ?? null}
          unit={pick.unit}
          source={currentSource}
          onChange={onQtyChange}
        />
        {currentSource === 'ai' && (
          <span className="text-[10px] text-amber-700 dark:text-amber-400">Sasha's estimate · tap to edit</span>
        )}
      </div>
    </div>
  );
}
