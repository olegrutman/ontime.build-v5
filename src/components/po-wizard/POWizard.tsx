import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { POWizardData, INITIAL_PO_WIZARD_DATA } from '@/types/poWizard';
import { WizardProgress } from './WizardProgress';
import { SupplierStep } from './steps/SupplierStep';
import { ProjectStep } from './steps/ProjectStep';
import { ItemsStep } from './steps/ItemsStep';
import { NotesStep } from './steps/NotesStep';
import { ReviewStep } from './steps/ReviewStep';

const STEPS = [
  { title: 'Supplier', key: 'supplier' },
  { title: 'Project', key: 'project' },
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
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<POWizardData>(() => ({
    ...INITIAL_PO_WIZARD_DATA,
    project_id: initialProjectId,
    project_name: initialProjectName || undefined,
  }));

  const handleChange = (updates: Partial<POWizardData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 1: // Supplier - required
        return !!formData.supplier_id;
      case 2: // Project - required
        return !!formData.project_id;
      case 3: // Items - need at least one
        return formData.line_items.length > 0;
      case 4: // Notes - optional
        return true;
      case 5: // Review - all required fields
        return !!formData.supplier_id && !!formData.project_id && formData.line_items.length > 0;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (currentStep < STEPS.length && canGoNext()) {
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
          totalSteps={STEPS.length}
          steps={STEPS}
        />

        <div className="p-6 min-h-[400px] max-h-[60vh] overflow-y-auto">
          {currentStep === 1 && (
            <SupplierStep data={formData} onChange={handleChange} />
          )}
          {currentStep === 2 && (
            <ProjectStep
              data={formData}
              onChange={handleChange}
              initialProjectId={initialProjectId}
              initialProjectName={initialProjectName}
            />
          )}
          {currentStep === 3 && (
            <ItemsStep
              data={formData}
              onChange={handleChange}
              supplierId={formData.supplier_id}
            />
          )}
          {currentStep === 4 && (
            <NotesStep data={formData} onChange={handleChange} />
          )}
          {currentStep === 5 && (
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

          {currentStep < STEPS.length ? (
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
