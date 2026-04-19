import { useMemo, useState, useEffect, useRef } from 'react';
import { WizardQuestion as WizardQuestionComponent } from './WizardQuestion';
import { SOVLivePreview } from './SOVLivePreview';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
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

  const nonEmptySteps = useMemo(
    () => SCOPE_STEPS.filter((s) => (questionsByStep[s.key] || []).length > 0),
    [questionsByStep],
  );

  const [openSection, setOpenSection] = useState<string>('');
  const initRef = useRef(false);

  // Initialize default open: first non-empty section
  useEffect(() => {
    if (!initRef.current && nonEmptySteps.length > 0) {
      setOpenSection(nonEmptySteps[0].key);
      initRef.current = true;
    }
  }, [nonEmptySteps]);

  // Auto-advance: when all questions in current section answered, open next
  useEffect(() => {
    if (!openSection) return;
    const currentQs = questionsByStep[openSection] || [];
    if (currentQs.length === 0) return;
    const allAnswered = currentQs.every((q) => {
      const v = answers[q.fieldKey];
      return v !== null && v !== undefined && v !== '';
    });
    if (!allAnswered) return;
    const idx = nonEmptySteps.findIndex((s) => s.key === openSection);
    const next = nonEmptySteps[idx + 1];
    if (next) setOpenSection(next.key);
  }, [answers, openSection, questionsByStep, nonEmptySteps]);

  const getProgress = (stepKey: string) => {
    const qs = questionsByStep[stepKey] || [];
    const answered = qs.filter((q) => {
      const v = answers[q.fieldKey];
      return v !== null && v !== undefined && v !== '';
    }).length;
    return { answered, total: qs.length };
  };

  return (
    <div className={`grid grid-cols-1 gap-6 ${showDualSov ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
      {/* Left: Scope questions */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Scope</h2>
          <p className="text-sm text-muted-foreground">
            Answer questions about your project scope. The SOV updates live as you go.
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          value={openSection}
          onValueChange={setOpenSection}
          className="border border-border rounded-lg bg-card divide-y"
        >
          {nonEmptySteps.map((step) => {
            const qs = questionsByStep[step.key];
            const { answered, total } = getProgress(step.key);
            const complete = answered === total && total > 0;
            return (
              <AccordionItem key={step.key} value={step.key} className="border-b-0">
                <AccordionTrigger className="px-3 py-2.5 hover:no-underline">
                  <div className="flex items-center justify-between flex-1 pr-2">
                    <span className="font-heading text-sm font-bold text-foreground">
                      {step.label}
                    </span>
                    <span className={`text-xs tabular-nums ${complete ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}`}>
                      {answered} / {total}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3 pt-1">
                  <div className="space-y-3">
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
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* SOV 1: GC → TC or single SOV */}
      <div className="border border-border rounded-lg overflow-hidden bg-card flex flex-col h-[calc(100vh-280px)]">
        <div className="px-3 py-1.5 border-b bg-muted/30 shrink-0">
          <p className="text-xs font-medium text-muted-foreground">
            {isTC ? 'General Contractor → Trade Contractor SOV' : 'SOV Preview'}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SOVLivePreview lines={sovLines} buildingType={buildingType} />
        </div>
      </div>

      {/* SOV 2: TC → FC (only for TC) */}
      {showDualSov && (
        <div className="border border-border rounded-lg overflow-hidden bg-card flex flex-col h-[calc(100vh-280px)]">
          <div className="px-3 py-1.5 border-b bg-muted/30 shrink-0">
            <p className="text-xs font-medium text-muted-foreground">Trade Contractor → Field Crew SOV</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SOVLivePreview lines={fcSovLines} buildingType={buildingType} />
          </div>
        </div>
      )}
    </div>
  );
}
