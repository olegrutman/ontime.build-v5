import { useState, useMemo } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2, Building } from 'lucide-react';
import { POWizardData, INITIAL_PO_WIZARD_DATA } from '@/types/poWizard';
import { WizardProgress } from './WizardProgress';
import { SupplierStep } from './steps/SupplierStep';
import { ProjectStep } from './steps/ProjectStep';
import { ItemsStep } from './steps/ItemsStep';
import { NotesStep } from './steps/NotesStep';
import { ReviewStep } from './steps/ReviewStep';

const ALL_STEPS = [
  { title: 'Project', key: 'project' },
  { title: 'Supplier', key: 'supplier' },
  { title: 'Items', key: 'items' },
  { title: 'Notes', key: 'notes' },
  { title: 'Review', key: 'review' },
];

const STEPS_WITHOUT_PROJECT = [
  { title: 'Supplier', key: 'supplier' },
  { title: 'Items', key: 'items' },
  { title: 'Notes', key: 'notes' },
  { title: 'Review', key: 'review' },
];

interface POWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: POWizardData) => Promise<void>;
  isSubmitting?: boolean;
  // Optional: pre-fill project context when opened from project page
  initialProjectId?: string | null;
  initialProjectName?: string | null;
}

export function POWizard({
  open,
  onOpenChange,
  onComplete,
  isSubmitting = false,
  initialProjectId = null,
  initialProjectName = null,
}: POWizardProps) {
  // Use different steps based on whether project is pre-selected
  const steps = useMemo(() => 
    initialProjectId ? STEPS_WITHOUT_PROJECT : ALL_STEPS, 
    [initialProjectId]
  );

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<POWizardData>(() => ({
    ...INITIAL_PO_WIZARD_DATA,
    project_id: initialProjectId,
    project_name: initialProjectName || undefined,
  }));

  // Get current step key for determining which component to show
  const currentStepKey = steps[currentStep - 1]?.key;

  const handleChange = (updates: Partial<POWizardData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canGoNext = (): boolean => {
    switch (currentStepKey) {
      case 'project':
        return !!formData.project_id;
      case 'supplier':
        return !!formData.supplier_id;
      case 'items':
        return formData.line_items.length > 0;
      case 'notes':
        return true;
      case 'review':
        return !!formData.supplier_id && !!formData.project_id && formData.line_items.length > 0;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStep < steps.length && canGoNext()) {
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    await onComplete(formData);
    resetWizard();
    onOpenChange(false);
  };

  const resetWizard = () => {
    setFormData({
      ...INITIAL_PO_WIZARD_DATA,
      project_id: initialProjectId,
      project_name: initialProjectName || undefined,
    });
    setCurrentStep(1);
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh]">
        <WizardProgress
          currentStep={currentStep}
          totalSteps={steps.length}
          steps={steps}
        />

        {/* Context banner when project is pre-selected */}
        {initialProjectId && (
          <div className="px-6 py-2 bg-muted/50 border-b flex items-center gap-2 text-sm">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Creating PO for:</span>
            <span className="font-medium">{initialProjectName}</span>
          </div>
        )}

        <div className="p-6 min-h-[400px] max-h-[60vh] overflow-y-auto">
          {currentStepKey === 'project' && (
            <ProjectStep
              data={formData}
              onChange={handleChange}
              initialProjectId={initialProjectId}
              initialProjectName={initialProjectName}
            />
          )}
          {currentStepKey === 'supplier' && (
            <SupplierStep data={formData} onChange={handleChange} projectId={formData.project_id} />
          )}
          {currentStepKey === 'items' && (
            <ItemsStep
              data={formData}
              onChange={handleChange}
              supplierId={formData.supplier_id}
            />
          )}
          {currentStepKey === 'notes' && (
            <NotesStep data={formData} onChange={handleChange} />
          )}
          {currentStepKey === 'review' && (
            <ReviewStep data={formData} />
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {currentStep < steps.length ? (
            <Button onClick={goNext} disabled={!canGoNext()}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting || !canGoNext()}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create PO
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
