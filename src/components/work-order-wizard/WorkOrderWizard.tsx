import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProjectScope } from '@/hooks/useProjectScope';
import { WorkOrderWizardData, INITIAL_WIZARD_DATA } from '@/types/workOrderWizard';
import { WizardProgress } from './WizardProgress';
import { TitleStep } from './steps/TitleStep';
import { LocationStep } from './steps/LocationStep';
import { WorkTypeStep } from './steps/WorkTypeStep';
import { ScopeDetailsStep } from './steps/ScopeDetailsStep';
import { PricingModeStep } from './steps/PricingModeStep';
import { ResourcesStep } from './steps/ResourcesStep';
import { AssignmentStep } from './steps/AssignmentStep';
import { ReviewStep } from './steps/ReviewStep';

const STEPS = [
  { title: 'Title', key: 'title' },
  { title: 'Location', key: 'location' },
  { title: 'Work Type', key: 'worktype' },
  { title: 'Scope', key: 'scope' },
  { title: 'Pricing', key: 'pricing' },
  { title: 'Resources', key: 'resources' },
  { title: 'Assignment', key: 'assignment' },
  { title: 'Review', key: 'review' },
];

interface WorkOrderWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onComplete: (data: WorkOrderWizardData & { project_id: string }) => Promise<void>;
  isSubmitting?: boolean;
  initialData?: Partial<WorkOrderWizardData>;
}

export function WorkOrderWizard({
  open,
  onOpenChange,
  projectId,
  projectName,
  onComplete,
  isSubmitting = false,
  initialData,
}: WorkOrderWizardProps) {
  const { currentRole } = useAuth();
  const { data: projectScope } = useProjectScope(projectId);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WorkOrderWizardData>({
    ...INITIAL_WIZARD_DATA,
    ...initialData,
  });

  useEffect(() => {
    if (open) {
      setFormData({ ...INITIAL_WIZARD_DATA, ...initialData });
      setCurrentStep(1);
    }
  }, [open, initialData]);

  const isGC = currentRole === 'GC_PM';
  const isTC = currentRole === 'TC_PM';

  const handleChange = (updates: Partial<WorkOrderWizardData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 1: // Title - optional
        return true;
      case 2: // Location - need at least level or exterior feature
        return !!(
          formData.location_data.level || 
          formData.location_data.exterior_level
        );
      case 3: // Work Type - required
        return !!formData.work_type;
      case 4: // Resources - optional but if answered, must be complete
        return true;
      case 5: // Assignment - optional
        return true;
      case 6: // Review
        return true;
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
    // Generate title if empty
    const title = formData.title || generateTitleFromLocation(formData);

    await onComplete({
      ...formData,
      title,
      project_id: projectId,
    });
    
    resetWizard();
    onOpenChange(false);
  };

  const resetWizard = () => {
    setFormData(INITIAL_WIZARD_DATA);
    setCurrentStep(1);
  };

  const handleClose = () => {
    resetWizard();
    onOpenChange(false);
  };

  // Get assignee name for review step
  const assigneeName = useMemo(() => {
    // This would be populated from assignment step
    return undefined; // Will be handled by ReviewStep internally
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <WizardProgress
          currentStep={currentStep}
          totalSteps={STEPS.length}
          steps={STEPS}
        />

        <div className="px-6 pb-6 pt-8 min-h-[400px] max-h-[60vh] overflow-y-auto">
          {currentStep === 1 && (
            <TitleStep data={formData} onChange={handleChange} />
          )}
          {currentStep === 2 && (
            <LocationStep
              data={formData}
              onChange={handleChange}
              projectScope={projectScope || null}
            />
          )}
          {currentStep === 3 && (
            <WorkTypeStep data={formData} onChange={handleChange} />
          )}
          {currentStep === 4 && (
            <ScopeDetailsStep data={formData} onChange={handleChange} />
          )}
          {currentStep === 5 && (
            <PricingModeStep data={formData} onChange={handleChange} />
          )}
          {currentStep === 6 && (
            <ResourcesStep data={formData} onChange={handleChange} isGC={isGC} />
          )}
          {currentStep === 7 && (
            <AssignmentStep
              data={formData}
              onChange={handleChange}
              projectId={projectId}
              isGC={isGC}
              isTC={isTC}
            />
          )}
          {currentStep === 8 && (
            <ReviewStep
              data={formData}
              onChange={handleChange}
              projectId={projectId}
              projectName={projectName}
              projectScope={projectScope || null}
              assigneeName={assigneeName}
            />
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
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Work Order
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function generateTitleFromLocation(data: WorkOrderWizardData): string {
  const loc = data.location_data;
  const parts: string[] = [];

  if (loc.inside_outside === 'inside') {
    if (loc.level) parts.push(loc.level);
    if (loc.room_area && loc.room_area !== 'Other') {
      parts.push(loc.room_area);
    } else if (loc.custom_room_area) {
      parts.push(loc.custom_room_area);
    }
  } else if (loc.inside_outside === 'outside') {
    if (loc.exterior_feature === 'other' && loc.custom_exterior) {
      parts.push(loc.custom_exterior);
    } else if (loc.exterior_feature) {
      // Convert value like "balcony_left" to "Balcony Left"
      const formatted = loc.exterior_feature
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      parts.push(formatted);
    }
  }

  return parts.length > 0 ? parts.join(' - ') : 'Work Order';
}
