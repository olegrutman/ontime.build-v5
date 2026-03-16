import { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Check, Circle, Lock, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProjectLaborRates } from '@/hooks/useProjectLaborRates';
import { UnifiedWizardData, INITIAL_UNIFIED_WIZARD_DATA, ALL_WIZARD_STEPS, WizardStepDef } from '@/types/unifiedWizard';
import { IntentStep } from './steps/IntentStep';
import { CaptureModeStep } from './steps/CaptureModeStep';
import { ScopeStep } from './steps/ScopeStep';
import { LocationStep } from './steps/LocationStep';
import { LaborStep } from './steps/LaborStep';
import { MaterialsStep } from './steps/MaterialsStep';
import { EquipmentStep } from './steps/EquipmentStep';
import { ReviewStep } from './steps/ReviewStep';
import { FinancialSummaryStrip } from './FinancialSummaryStrip';

interface UnifiedWOWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onComplete?: (data: UnifiedWizardData & { project_id: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export function UnifiedWOWizard({
  open,
  onOpenChange,
  projectId,
  projectName,
  onComplete,
  isSubmitting = false,
}: UnifiedWOWizardProps) {
  const { currentRole } = useAuth();
  const isMobile = useIsMobile();
  const { myRate: projectRate } = useProjectLaborRates(projectId);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<UnifiedWizardData>({ ...INITIAL_UNIFIED_WIZARD_DATA });

  // Determine which steps to show based on role
  const visibleSteps = useMemo(() => {
    const isTC = currentRole === 'TC_PM';
    return ALL_WIZARD_STEPS.filter((step) => {
      // Step 0 (Intent) is TC-only
      if (step.key === 'intent' && !isTC) return false;
      return true;
    });
  }, [currentRole]);

  const currentStep = visibleSteps[currentStepIndex];
  const totalSteps = visibleSteps.length;

  // Pre-set defaults based on role
  useMemo(() => {
    if (currentRole === 'GC_PM' && !formData.wo_request_type) {
      setFormData(prev => ({ ...prev, wo_request_type: 'request' }));
    }
    if (currentRole === 'FC_PM' && !formData.wo_request_type) {
      setFormData(prev => ({ ...prev, wo_request_type: 'log' }));
    }
  }, [currentRole]);

  const handleChange = useCallback((updates: Partial<UnifiedWizardData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const canGoNext = (): boolean => {
    if (!currentStep) return false;
    switch (currentStep.key) {
      case 'intent': return !!formData.wo_request_type;
      case 'mode': return !!formData.wo_mode;
      case 'scope': return formData.selectedCatalogItems.length > 0;
      case 'location': return formData.location_tags.length > 0;
      case 'labor': {
        if (formData.labor_mode === 'lump_sum') return (formData.lump_sum_amount ?? 0) > 0;
        return (formData.hourly_rate ?? 0) > 0;
      }
      case 'materials': return true;
      case 'equipment': return true;
      case 'review': return true;
      default: return true;
    }
  };

  const goNext = () => {
    if (currentStepIndex < totalSteps - 1 && canGoNext()) {
      setCurrentStepIndex(i => i + 1);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(i => i - 1);
    }
  };

  const jumpToStep = (index: number) => {
    if (index < currentStepIndex) {
      setCurrentStepIndex(index);
    }
  };

  const handleClose = () => {
    setFormData({ ...INITIAL_UNIFIED_WIZARD_DATA });
    setCurrentStepIndex(0);
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (onComplete) {
      await onComplete({ ...formData, project_id: projectId });
    }
    handleClose();
  };

  const renderStepContent = () => {
    if (!currentStep) return null;
    switch (currentStep.key) {
      case 'intent':
        return <IntentStep data={formData} onChange={handleChange} />;
      case 'mode':
        return <CaptureModeStep data={formData} onChange={handleChange} />;
      case 'scope':
        return <ScopeStep data={formData} onChange={handleChange} />;
      default:
        return (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Step "{currentStep.title}" — coming in next phase
          </div>
        );
    }
  };

  const getStepStatus = (index: number): 'complete' | 'current' | 'locked' => {
    if (index < currentStepIndex) return 'complete';
    if (index === currentStepIndex) return 'current';
    return 'locked';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold font-barlow-condensed text-foreground">
                New Work Order
              </h2>
              <p className="text-xs text-muted-foreground">{projectName}</p>
            </div>
            <div className="text-xs text-muted-foreground">
              Step {currentStepIndex + 1} of {totalSteps}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 rounded-full bg-muted/40 overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Desktop step list (left sidebar) */}
          {!isMobile && (
            <div className="w-56 border-r bg-muted/20 p-4 space-y-1 overflow-y-auto shrink-0">
              {visibleSteps.map((step, i) => {
                const status = getStepStatus(i);
                return (
                  <button
                    key={step.key}
                    onClick={() => jumpToStep(i)}
                    disabled={status === 'locked'}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                      status === 'current'
                        ? 'bg-primary/10 text-foreground font-medium'
                        : status === 'complete'
                          ? 'text-foreground hover:bg-muted/50 cursor-pointer'
                          : 'text-muted-foreground/50 cursor-not-allowed'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      status === 'complete'
                        ? 'bg-primary text-primary-foreground'
                        : status === 'current'
                          ? 'bg-foreground text-background'
                          : 'border border-muted-foreground/30'
                    }`}>
                      {status === 'complete' ? (
                        <Check className="w-3 h-3" />
                      ) : status === 'current' ? (
                        <Circle className="w-2 h-2 fill-current" />
                      ) : (
                        <Circle className="w-2 h-2" />
                      )}
                    </span>
                    <span className="truncate">{step.title}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-foreground">{currentStep?.title}</h3>
              <p className="text-sm text-muted-foreground">{currentStep?.description}</p>
            </div>
            {renderStepContent()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-muted/30 shrink-0">
          <Button variant="ghost" onClick={goBack} disabled={currentStepIndex === 0}>
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {currentStepIndex < totalSteps - 1 ? (
            <Button onClick={goNext} disabled={!canGoNext()}>
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              Submit Work Order
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
