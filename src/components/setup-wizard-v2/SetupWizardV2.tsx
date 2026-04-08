import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2, Pencil } from 'lucide-react';
import { BuildingTypeSelector } from './BuildingTypeSelector';
import { WizardQuestion } from './WizardQuestion';
import { SOVLivePreview } from './SOVLivePreview';
import { WizardProgressBar } from './WizardProgressBar';
import { useSetupWizardV2, type SOVPhase, WIZARD_STEPS } from '@/hooks/useSetupWizardV2';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Props {
  projectId: string;
  onComplete?: () => void;
}

// Map wizard steps to question phases
const STEP_PHASES: Record<string, SOVPhase[]> = {
  structure: ['mobilization_steel', 'per_floor'],
  roof: ['roof'],
  envelope: ['envelope'],
  backout: ['backout'],
  exterior: ['exterior_finish'],
};

export function SetupWizardV2({ projectId, onComplete }: Props) {
  const { toast } = useToast();
  const {
    buildingType,
    selectBuildingType,
    answers,
    setAnswer,
    visibleQuestions,
    sovLines,
    save,
    isSaving,
  } = useSetupWizardV2(projectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [mobileTab, setMobileTab] = useState<string>('questions');

  // Get questions for current step
  const stepQuestions = useMemo(() => {
    const stepKey = WIZARD_STEPS[currentStep]?.key;
    if (!stepKey || stepKey === 'building_type' || stepKey === 'review') return [];
    const phases = STEP_PHASES[stepKey] || [];
    return visibleQuestions.filter((q) => phases.includes(q.phase));
  }, [currentStep, visibleQuestions]);

  const stepKey = WIZARD_STEPS[currentStep]?.key;
  const isTypeStep = stepKey === 'building_type';
  const isReviewStep = stepKey === 'review';

  const goNext = useCallback(() => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(async () => {
    try {
      await save();
      setCompleted(true);
      toast({ title: 'Setup complete!', description: `${sovLines.length} SOV line items generated.` });
      onComplete?.();
    } catch (e) {
      toast({ title: 'Error saving setup', variant: 'destructive' });
    }
  }, [save, sovLines.length, toast, onComplete]);

  // Completed state
  if (completed) {
    return (
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-heading text-sm font-bold">Setup Complete</p>
            <p className="text-[11px] text-muted-foreground">
              {sovLines.length} SOV line items generated
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCompleted(false)} className="gap-1.5">
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </Button>
      </div>
    );
  }

  const questionPanel = (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="max-w-lg mx-auto space-y-4">
        {isTypeStep && (
          <BuildingTypeSelector
            selected={buildingType}
            onSelect={(bt) => {
              selectBuildingType(bt);
              goNext();
            }}
          />
        )}

        {!isTypeStep && !isReviewStep && (
          <>
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                {WIZARD_STEPS[currentStep]?.label}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stepQuestions.length} question{stepQuestions.length !== 1 ? 's' : ''} in this section
              </p>
            </div>
            {stepQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No questions for this building type in this section. Click Next to continue.
              </p>
            ) : (
              stepQuestions.map((q) => (
              <WizardQuestion
                  key={q.id}
                  question={q}
                  value={answers[q.fieldKey] ?? null}
                  onChange={(val) => setAnswer(q.fieldKey, val)}
                  answers={answers}
                />
              ))
            )}
          </>
        )}

        {isReviewStep && (
          <div className="space-y-4">
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">Review & Complete</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your SOV has {sovLines.length} line items. Review the preview, then save.
              </p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-muted/10">
              <p className="text-sm text-foreground">
                <strong>Building type:</strong>{' '}
                {buildingType?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
              <p className="text-sm text-foreground mt-1">
                <strong>SOV lines:</strong> {sovLines.length}
              </p>
              <p className="text-sm text-foreground mt-1">
                <strong>Questions answered:</strong> {Object.keys(answers).length}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        {!isTypeStep && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={goPrev}>
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              {isReviewStep ? (
                <Button size="sm" onClick={handleComplete} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Complete Setup'}
                </Button>
              ) : (
                <Button size="sm" onClick={goNext}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const sovPanel = (
    <SOVLivePreview lines={sovLines} buildingType={buildingType} />
  );

  return (
    <div className="flex flex-col h-full">
      <WizardProgressBar currentStep={currentStep} />

      {/* Desktop: split-screen */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-border">
          {questionPanel}
        </div>
        <div className="w-[360px] shrink-0 flex flex-col bg-muted/5">
          {sovPanel}
        </div>
      </div>

      {/* Mobile: tabbed */}
      <div className="md:hidden flex-1 flex flex-col overflow-hidden">
        <Tabs value={mobileTab} onValueChange={setMobileTab} className="flex flex-col flex-1">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="questions" className="text-xs">Questions</TabsTrigger>
            <TabsTrigger value="sov" className="text-xs">SOV Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="questions" className="flex-1 overflow-hidden">
            {questionPanel}
          </TabsContent>
          <TabsContent value="sov" className="flex-1 overflow-hidden">
            {sovPanel}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
