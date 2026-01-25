import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { LocationStep } from './LocationStep';
import { TitleStep } from './TitleStep';
import { WorkTypeStep } from './WorkTypeStep';
import { DescriptionStep } from './DescriptionStep';
import { MaterialsStep } from './MaterialsStep';
import { EquipmentStep } from './EquipmentStep';
import {
  ChangeOrderWizardData,
  LocationData,
  ChangeOrderWorkType,
  CostResponsibility,
} from '@/types/changeOrderProject';

interface ChangeOrderWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onComplete: (data: ChangeOrderWizardData & { project_id: string }) => Promise<void>;
  isSubmitting?: boolean;
}

const STEPS = [
  { id: 'location', label: 'Location' },
  { id: 'title', label: 'Title' },
  { id: 'work_type', label: 'Work Type' },
  { id: 'description', label: 'Description' },
  { id: 'materials', label: 'Materials' },
  { id: 'equipment', label: 'Equipment' },
];

const initialData: ChangeOrderWizardData = {
  location_data: {},
  title: '',
  work_type: null,
  description: '',
  requires_materials: false,
  material_cost_responsibility: null,
  requires_equipment: false,
  equipment_cost_responsibility: null,
};

export function ChangeOrderWizardDialog({
  open,
  onOpenChange,
  projectId,
  projectName,
  onComplete,
  isSubmitting = false,
}: ChangeOrderWizardDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<ChangeOrderWizardData>(initialData);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    await onComplete({ ...formData, project_id: projectId });
    // Reset form
    setFormData(initialData);
    setCurrentStep(0);
    onOpenChange(false);
  };

  const updateFormData = <K extends keyof ChangeOrderWizardData>(
    field: K,
    value: ChangeOrderWizardData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: // Location
        return !!formData.location_data.level || !!formData.location_data.room_area;
      case 1: // Title (optional)
        return true;
      case 2: // Work Type
        return !!formData.work_type;
      case 3: // Description
        return true; // Optional
      case 4: // Materials
        return !formData.requires_materials || !!formData.material_cost_responsibility;
      case 5: // Equipment
        return !formData.requires_equipment || !!formData.equipment_cost_responsibility;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <LocationStep
            data={formData.location_data}
            onChange={(data: LocationData) => updateFormData('location_data', data)}
          />
        );
      case 1:
        return (
          <TitleStep
            title={formData.title}
            locationData={formData.location_data}
            onChange={(title: string) => updateFormData('title', title)}
          />
        );
      case 2:
        return (
          <WorkTypeStep
            workType={formData.work_type}
            onChange={(workType: ChangeOrderWorkType) => updateFormData('work_type', workType)}
          />
        );
      case 3:
        return (
          <DescriptionStep
            description={formData.description}
            onChange={(description: string) => updateFormData('description', description)}
          />
        );
      case 4:
        return (
          <MaterialsStep
            requiresMaterials={formData.requires_materials}
            costResponsibility={formData.material_cost_responsibility}
            onRequiresChange={(requires: boolean) => updateFormData('requires_materials', requires)}
            onResponsibilityChange={(resp: CostResponsibility) =>
              updateFormData('material_cost_responsibility', resp)
            }
          />
        );
      case 5:
        return (
          <EquipmentStep
            requiresEquipment={formData.requires_equipment}
            costResponsibility={formData.equipment_cost_responsibility}
            onRequiresChange={(requires: boolean) => updateFormData('requires_equipment', requires)}
            onResponsibilityChange={(resp: CostResponsibility) =>
              updateFormData('equipment_cost_responsibility', resp)
            }
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Change Order</DialogTitle>
          <p className="text-sm text-muted-foreground">Project: {projectName}</p>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-2 py-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span>{STEPS[currentStep].label}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="min-h-[300px] py-4">{renderStep()}</div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={!canProceed() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Create Change Order
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed()}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
