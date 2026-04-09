import { useMemo } from 'react';
import { WizardQuestion as WizardQuestionComponent } from './WizardQuestion';
import type { WizardQuestion, SOVPhase, BuildingType, Answers } from '@/hooks/useSetupWizardV2';

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

// Questions that belong in the Contracts step, not here
const CONTRACT_FIELD_KEYS = ['contract_value', 'fc_contract_value', 'material_responsibility'];

interface ScopeQuestionsPanelProps {
  buildingType: BuildingType;
  answers: Answers;
  setAnswer: (key: string, value: any) => void;
  visibleQuestions: WizardQuestion[];
}

export function ScopeQuestionsPanel({
  buildingType,
  answers,
  setAnswer,
  visibleQuestions,
}: ScopeQuestionsPanelProps) {
  // Filter out contract-related questions
  const scopeQuestions = useMemo(
    () => visibleQuestions.filter(q => !CONTRACT_FIELD_KEYS.includes(q.fieldKey)),
    [visibleQuestions],
  );

  const questionsByStep = useMemo(() => {
    const map: Record<string, WizardQuestion[]> = {};
    for (const step of SCOPE_STEPS) {
      const phases = STEP_PHASES[step.key] || [];
      map[step.key] = scopeQuestions.filter((q) => phases.includes(q.phase));
    }
    return map;
  }, [scopeQuestions]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Scope</h2>
        <p className="text-sm text-muted-foreground">
          Answer questions about your project scope. These determine SOV line items.
        </p>
      </div>

      <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2">
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
    </div>
  );
}
