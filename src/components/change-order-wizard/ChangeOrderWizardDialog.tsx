import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, Check, Loader2, MapPin, Type, Wrench, FileText, Package, Truck } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface ChangeOrderWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onComplete: (data: ChangeOrderWizardData & { project_id: string }) => Promise<void>;
  isSubmitting?: boolean;
}

const STEPS = [
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'title', label: 'Title', icon: Type },
  { id: 'work_type', label: 'Work Type', icon: Wrench },
  { id: 'description', label: 'Description', icon: FileText },
  { id: 'materials', label: 'Materials', icon: Package },
  { id: 'equipment', label: 'Equipment', icon: Truck },
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden p-0">
        <div className="flex h-full">
          {/* Left sidebar with step indicators */}
          <div className="hidden sm:block w-48 bg-muted/30 border-r p-4">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-sm font-medium text-muted-foreground">
                New Change Order
              </DialogTitle>
              <p className="text-xs text-muted-foreground truncate" title={projectName}>
                {projectName}
              </p>
            </DialogHeader>
            
            <nav className="space-y-1">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isComplete = index < currentStep;
                
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => index < currentStep && setCurrentStep(index)}
                    disabled={index > currentStep}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors",
                      isActive && "bg-primary text-primary-foreground",
                      isComplete && "text-primary hover:bg-primary/10 cursor-pointer",
                      !isActive && !isComplete && "text-muted-foreground cursor-not-allowed"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-xs",
                      isComplete && "bg-primary text-primary-foreground"
                    )}>
                      {isComplete ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Icon className="w-3 h-3" />
                      )}
                    </div>
                    <span className="truncate">{step.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main content area */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Mobile header */}
            <div className="sm:hidden p-4 border-b">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {STEPS[currentStep].label}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Step {currentStep + 1} of {STEPS.length} • {projectName}
                </p>
              </DialogHeader>
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto p-6">
              {renderStep()}
            </div>

            {/* Footer with navigation */}
            <div className="flex items-center justify-between p-4 border-t bg-background">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                disabled={currentStep === 0 || isSubmitting}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>

              <div className="flex items-center gap-1 sm:hidden">
                {STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      index === currentStep ? "bg-primary" : 
                      index < currentStep ? "bg-primary/50" : "bg-muted"
                    )}
                  />
                ))}
              </div>

              {isLastStep ? (
                <Button 
                  size="sm"
                  onClick={handleSubmit} 
                  disabled={!canProceed() || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Create
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  size="sm"
                  onClick={handleNext} 
                  disabled={!canProceed()}
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
