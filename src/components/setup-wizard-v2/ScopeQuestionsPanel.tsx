import { useMemo } from 'react';
import { WizardQuestion as WizardQuestionComponent } from './WizardQuestion';
import { SOVLivePreview } from './SOVLivePreview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { WizardQuestion, SOVPhase, BuildingType, Answers, SOVLine } from '@/hooks/useSetupWizardV2';

const STEP_PHASES: Record<string, SOVPhase[]> = {
  structure: ['mobilization_steel', 'per_floor'],
  roof: ['roof'],
  envelope: ['envelope'],
  backout: ['backout'],
  exterior: ['exterior_finish'],
};

const SCOPE_STEPS = [
  { key: 'structure', label: 'Structure' },
  { key: 'roof', label: 'Roof' },
  { key: 'envelope', label: 'Envelope' },
  { key: 'backout', label: 'Backout' },
  { key: 'exterior', label: 'Exterior' },
] as const;

interface ScopeQuestionsPanelProps {
  buildingType: BuildingType;
  answers: Answers;
  setAnswer: (key: string, value: any) => void;
  visibleQuestions: WizardQuestion[];
  sovLines: SOVLine[];
}

export function ScopeQuestionsPanel({
  buildingType,
  answers,
  setAnswer,
  visibleQuestions,
  sovLines,
}: ScopeQuestionsPanelProps) {
  // Group all visible questions by step
  const questionsByStep = useMemo(() => {
    const map: Record<string, WizardQuestion[]> = {};
    for (const step of SCOPE_STEPS) {
      const phases = STEP_PHASES[step.key] || [];
      map[step.key] = visibleQuestions.filter((q) => phases.includes(q.phase));
    }
    return map;
  }, [visibleQuestions]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Scope & Contract</h2>
        <p className="text-sm text-muted-foreground">
          Answer questions about your project scope. The SOV preview updates live.
        </p>
      </div>

      {/* Desktop: split layout */}
      <div className="hidden md:grid md:grid-cols-12 gap-4">
        <div className="col-span-7 space-y-6 max-h-[600px] overflow-y-auto pr-2">
          {SCOPE_STEPS.map((step) => {
            const qs = questionsByStep[step.key];
            if (!qs || qs.length === 0) return null;
            return (
              <div key={step.key} className="space-y-3">
                <h3 className="font-heading text-sm font-bold text-foreground border-b border-border pb-1.5">
                  {step.label}
                </h3>
                {qs.map((q) => (
                  <WizardQuestionComponent
                    key={q.id}
                    question={q}
                    value={answers[q.fieldKey] ?? null}
                    onChange={(val) => setAnswer(q.fieldKey, val)}
                    answers={answers}
                  />
                ))}
              </div>
            );
          })}
        </div>
        <div className="col-span-5 border-l border-border">
          <SOVLivePreview lines={sovLines} buildingType={buildingType} />
        </div>
      </div>

      {/* Mobile: tabs */}
      <div className="md:hidden">
        <Tabs defaultValue="questions">
          <TabsList className="w-full">
            <TabsTrigger value="questions" className="flex-1 text-xs">Questions</TabsTrigger>
            <TabsTrigger value="sov" className="flex-1 text-xs">SOV Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="questions" className="space-y-6 mt-4 max-h-[500px] overflow-y-auto">
            {SCOPE_STEPS.map((step) => {
              const qs = questionsByStep[step.key];
              if (!qs || qs.length === 0) return null;
              return (
                <div key={step.key} className="space-y-3">
                  <h3 className="font-heading text-sm font-bold text-foreground border-b border-border pb-1.5">
                    {step.label}
                  </h3>
                  {qs.map((q) => (
                    <WizardQuestionComponent
                      key={q.id}
                      question={q}
                      value={answers[q.fieldKey] ?? null}
                      onChange={(val) => setAnswer(q.fieldKey, val)}
                      answers={answers}
                    />
                  ))}
                </div>
              );
            })}
          </TabsContent>
          <TabsContent value="sov" className="mt-4">
            <SOVLivePreview lines={sovLines} buildingType={buildingType} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
