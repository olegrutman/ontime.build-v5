import { useEffect, useMemo, useState } from 'react';
import { WizardQuestion as WizardQuestionComponent } from './WizardQuestion';
import { SOVLivePreview } from './SOVLivePreview';
import type { WizardQuestion, SOVPhase, BuildingType, Answers, SOVLine } from '@/hooks/useSetupWizardV2';
import { generateSOVLines } from '@/hooks/useSetupWizardV2';
import { OrgType } from '@/types/organization';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

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

function isAnswered(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true; // 0 counts as answered (e.g. 0%)
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

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

  const sectionsWithQuestions = useMemo(() => {
    return SCOPE_STEPS.map((step) => {
      const phases = STEP_PHASES[step.key] || [];
      const qs = scopeQuestions.filter((q) => phases.includes(q.phase));
      const answered = qs.filter((q) => isAnswered(answers[q.fieldKey])).length;
      return { ...step, questions: qs, answered, total: qs.length };
    }).filter((s) => s.total > 0);
  }, [scopeQuestions, answers]);

  // Open the first non-fully-answered section by default
  const defaultOpen = useMemo(() => {
    const firstUnfinished = sectionsWithQuestions.find((s) => s.answered < s.total);
    return (firstUnfinished ?? sectionsWithQuestions[0])?.key ?? '';
  }, [sectionsWithQuestions]);

  const [openSection, setOpenSection] = useState<string>(defaultOpen);

  // Initialize once when sections become available
  useEffect(() => {
    if (!openSection && defaultOpen) setOpenSection(defaultOpen);
  }, [defaultOpen, openSection]);

  // Auto-advance: when current section is fully answered, move to next unfinished
  useEffect(() => {
    if (!openSection) return;
    const currentIdx = sectionsWithQuestions.findIndex((s) => s.key === openSection);
    if (currentIdx < 0) return;
    const current = sectionsWithQuestions[currentIdx];
    if (current.total > 0 && current.answered === current.total) {
      const next = sectionsWithQuestions
        .slice(currentIdx + 1)
        .find((s) => s.answered < s.total);
      if (next && next.key !== openSection) {
        setOpenSection(next.key);
      }
    }
  }, [sectionsWithQuestions, openSection]);

  // FC SOV lines: same percentages, different contract value
  const fcSovLines = useMemo(() => {
    if (!isTC || fcContractValue <= 0) return [];
    const fcAnswers = { ...answers, contract_value: fcContractValue };
    return generateSOVLines(buildingType, fcAnswers);
  }, [isTC, buildingType, answers, fcContractValue]);

  const showDualSov = isTC && fcContractValue > 0;

  return (
    <div className={`grid grid-cols-1 gap-6 min-h-[calc(100vh-240px)] ${showDualSov ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
      {/* Left: Scope questions in collapsible accordion */}
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
          onValueChange={(v) => setOpenSection(v)}
          className="space-y-2"
        >
          {sectionsWithQuestions.map((section) => {
            const complete = section.answered === section.total;
            return (
              <AccordionItem
                key={section.key}
                value={section.key}
                className="border border-border rounded-lg bg-card px-3"
              >
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-heading text-sm font-bold text-foreground">
                      {section.label}
                    </span>
                    <span
                      className={`ml-auto text-xs font-medium ${
                        complete ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}
                    >
                      {section.answered} of {section.total}
                      {complete ? ' ✓' : ''}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-1 pb-3">
                  <div className="space-y-3">
                    {section.questions.map((q) => (
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
