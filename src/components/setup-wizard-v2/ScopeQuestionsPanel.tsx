import { useMemo } from 'react';
import { WizardQuestion as WizardQuestionComponent } from './WizardQuestion';
import { SOVLivePreview } from './SOVLivePreview';
import type { WizardQuestion, SOVPhase, BuildingType, Answers, SOVLine } from '@/hooks/useSetupWizardV2';
import { generateSOVLines } from '@/hooks/useSetupWizardV2';
import { OrgType } from '@/types/organization';

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

const CONTRACT_FIELD_KEYS = ['contract_value', 'fc_contract_value', 'material_responsibility'];

interface ScopeQuestionsPanelProps {
  buildingType: BuildingType;
  answers: Answers;
  setAnswer: (key: string, value: any) => void;
  visibleQuestions: WizardQuestion[];
  sovLines: SOVLine[];
  contractValue: number;
  fcContractValue: number;
  creatorOrgType?: OrgType;
}

export function ScopeQuestionsPanel({
  buildingType,
  answers,
  setAnswer,
  visibleQuestions,
  sovLines,
  contractValue,
  fcContractValue,
  creatorOrgType,
}: ScopeQuestionsPanelProps) {
  const isTC = creatorOrgType === 'TC';

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

  // FC SOV lines: same percentages, different contract value
  const fcSovLines = useMemo(() => {
    if (!isTC || fcContractValue <= 0) return [];
    const fcAnswers = { ...answers, contract_value: fcContractValue };
    return generateSOVLines(buildingType, fcAnswers);
  }, [isTC, buildingType, answers, fcContractValue]);

  const showDualSov = isTC && fcContractValue > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-240px)]">
      {/* Left: Scope questions */}
      <div className="space-y-6 overflow-y-auto pr-2">
        <div>
          <h2 className="text-lg font-semibold">Scope</h2>
          <p className="text-sm text-muted-foreground">
            Answer questions about your project scope. The SOV updates live as you go.
          </p>
        </div>

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

      {/* Right: Live SOV preview(s) */}
      <div className="flex flex-col gap-3">
        <div className={`border border-border rounded-lg overflow-hidden bg-card flex flex-col ${showDualSov ? 'h-[calc(50vh-120px)]' : 'h-[calc(100vh-280px)]'}`}>
          <div className="px-3 py-1.5 border-b bg-muted/30 shrink-0">
            <p className="text-xs font-medium text-muted-foreground">
              {isTC ? 'GC → TC SOV' : 'SOV Preview'}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SOVLivePreview lines={sovLines} buildingType={buildingType} />
          </div>
        </div>

        {showDualSov && (
          <div className="border border-border rounded-lg overflow-hidden bg-card flex flex-col h-[calc(50vh-120px)]">
            <div className="px-3 py-1.5 border-b bg-muted/30 shrink-0">
              <p className="text-xs font-medium text-muted-foreground">TC → FC SOV</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SOVLivePreview lines={fcSovLines} buildingType={buildingType} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
