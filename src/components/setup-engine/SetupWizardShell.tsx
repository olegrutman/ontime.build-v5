import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { DynamicSection } from './DynamicSection';
import { useSetupQuestions, type SectionGroup } from '@/hooks/useSetupQuestions';
import { Skeleton } from '@/components/ui/skeleton';

/* ── Phase definitions matching spreadsheet ────────────────────────── */
const PHASES = [
  { num: 1, name: 'Project Identity', icon: '📋' },
  { num: 2, name: 'What You\'re Building', icon: '🏗️' },
  { num: 3, name: 'Exterior Envelope', icon: '🏠' },
  { num: 4, name: 'Interior Rough', icon: '🔨' },
  { num: 5, name: 'Contract & Scope', icon: '📄' },
];

interface SetupWizardShellProps {
  projectId: string;
  buildingTypeSlug: string;
  onComplete?: () => void;
  onBuildingTypeChange?: (slug: string) => void;
}

export function SetupWizardShell({
  projectId,
  buildingTypeSlug,
  onComplete,
  onBuildingTypeChange,
}: SetupWizardShellProps) {
  const [activePhase, setActivePhase] = useState(1);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);

  const {
    answers,
    isLoading,
    getSections,
    getOptions,
    saveAnswer,
    isSaving,
    getPhaseCompletion,
  } = useSetupQuestions(projectId);

  const DISPLAY_TO_SLUG: Record<string, string> = {
    'Multifamily 3-5': 'mf_3to5',
    'Multifamily 6+': 'mf_6plus',
    'Single Family': 'custom_home',
    'Townhome': 'townhome',
    'Mixed-Use': 'mixed_use_commercial',
    'Senior Living': 'senior_living',
    'Hospitality': 'hotel',
    'Industrial': 'industrial',
  };

  const rawType = (answers.building_type as string) || '';
  const currentSlug = DISPLAY_TO_SLUG[rawType] || rawType || buildingTypeSlug || 'custom_home';

  // Get sections for current phase
  const sections = useMemo(
    () => getSections(currentSlug).filter((s) => {
      // Filter to current phase
      const phaseQuestions = s.questions.filter((q) => q.phase === activePhase);
      return phaseQuestions.length > 0;
    }).map((s) => ({
      ...s,
      questions: s.questions.filter((q) => q.phase === activePhase),
    })),
    [getSections, currentSlug, activePhase],
  );

  const currentSection = sections[activeSectionIdx] ?? sections[0];

  const handleAnswer = useCallback(
    (fieldKey: string, value: any) => {
      saveAnswer(fieldKey, value);
      if (fieldKey === 'building_type' && onBuildingTypeChange) {
        onBuildingTypeChange(DISPLAY_TO_SLUG[value] || value);
      }
    },
    [saveAnswer, onBuildingTypeChange, DISPLAY_TO_SLUG],
  );

  const goNext = useCallback(() => {
    if (activeSectionIdx < sections.length - 1) {
      setActiveSectionIdx((i) => i + 1);
    } else if (activePhase < 5) {
      setActivePhase((p) => p + 1);
      setActiveSectionIdx(0);
    } else {
      onComplete?.();
    }
  }, [activeSectionIdx, sections.length, activePhase, onComplete]);

  const goPrev = useCallback(() => {
    if (activeSectionIdx > 0) {
      setActiveSectionIdx((i) => i - 1);
    } else if (activePhase > 1) {
      setActivePhase((p) => p - 1);
      setActiveSectionIdx(999); // Will clamp to last section
    }
  }, [activeSectionIdx, activePhase]);

  // Clamp section index
  if (activeSectionIdx >= sections.length && sections.length > 0) {
    setActiveSectionIdx(sections.length - 1);
  }

  const totalPhaseCompletion = useMemo(() => {
    return PHASES.map((p) => getPhaseCompletion(p.num, currentSlug));
  }, [getPhaseCompletion, currentSlug]);

  const overallProgress = useMemo(() => {
    const total = totalPhaseCompletion.reduce((s, p) => s + p.total, 0);
    const answered = totalPhaseCompletion.reduce((s, p) => s + p.answered, 0);
    return total > 0 ? Math.round((answered / total) * 100) : 0;
  }, [totalPhaseCompletion]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isLastSection = activeSectionIdx === sections.length - 1;
  const isLastPhase = activePhase === 5;

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-5 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">
            Overall progress
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {overallProgress}%
          </span>
        </div>
        <Progress value={overallProgress} className="h-1.5" />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <div className="w-[200px] shrink-0 border-r border-border overflow-y-auto bg-muted/10 hidden md:block">
          {PHASES.map((p) => {
            const comp = totalPhaseCompletion[p.num - 1];
            const isActive = p.num === activePhase;
            const isDone = comp.total > 0 && comp.answered === comp.total;
            return (
              <div key={p.num}>
                <button
                  onClick={() => {
                    setActivePhase(p.num);
                    setActiveSectionIdx(0);
                  }}
                  className={cn(
                    'flex items-center gap-2 w-full text-left px-3 py-2 text-xs transition-all',
                    isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
                  )}
                >
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                    isDone ? 'bg-emerald-500 text-white' :
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    {isDone ? <Check className="w-3 h-3" /> : p.num}
                  </div>
                  <span className="truncate">{p.name}</span>
                  {comp.total > 0 && (
                    <span className="ml-auto text-[9px] text-muted-foreground">
                      {comp.answered}/{comp.total}
                    </span>
                  )}
                </button>

                {/* Sub-sections when active */}
                {isActive && sections.length > 1 && (
                  <div className="ml-5 border-l border-border/50">
                    {sections.map((s, idx) => (
                      <button
                        key={s.section}
                        onClick={() => setActiveSectionIdx(idx)}
                        className={cn(
                          'block w-full text-left pl-3 py-1 text-[10px] transition-colors',
                          idx === activeSectionIdx ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {s.section}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Phase header */}
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span>Phase {activePhase}</span>
                <span>·</span>
                <span>{PHASES[activePhase - 1]?.name}</span>
              </div>
              {currentSection && (
                <h2 className="font-heading text-lg font-bold">
                  {currentSection.section}
                </h2>
              )}
            </div>

            {/* Questions */}
            {currentSection && (
              <DynamicSection
                section={currentSection.section}
                questions={currentSection.questions}
                answers={answers}
                buildingTypeSlug={currentSlug}
                onAnswer={handleAnswer}
                getOptions={getOptions}
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={goPrev}
                disabled={activePhase === 1 && activeSectionIdx === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>

              <div className="flex items-center gap-2">
                {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                <Button size="sm" onClick={goNext}>
                  {isLastPhase && isLastSection ? 'Complete Setup' : 'Next'}
                  {!(isLastPhase && isLastSection) && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
