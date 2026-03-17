import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { COCreatedByRole, COReasonCode, COPricingType, WorkOrderCatalogItem } from '@/types/changeOrder';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { StepCatalog } from './StepCatalog';
import { StepLocation } from './StepLocation';
import { StepReason } from './StepReason';
import { StepConfig } from './StepConfig';

export interface COWizardData {
  selectedItems:        WorkOrderCatalogItem[];
  scopeDescription:     string;
  title:                string;
  locationTag:          string;
  reason:               COReasonCode | null;
  reasonNote:           string;
  pricingType:          COPricingType;
  nteCap:               string;
  assignedToOrgId:      string;
  fcInputNeeded:        boolean;
  materialsNeeded:      boolean;
  materialsOnSite:      boolean;
  equipmentNeeded:      boolean;
  materialsResponsible: 'GC' | 'TC' | null;
  equipmentResponsible: 'GC' | 'TC' | null;
  shareDraftNow:        boolean;
}

const INITIAL_DATA: COWizardData = {
  selectedItems:        [],
  scopeDescription:     '',
  title:                '',
  locationTag:          '',
  reason:               null,
  reasonNote:           '',
  pricingType:          'fixed',
  nteCap:               '',
  assignedToOrgId:      '',
  fcInputNeeded:        false,
  materialsNeeded:      false,
  materialsOnSite:      false,
  equipmentNeeded:      false,
  materialsResponsible: null,
  equipmentResponsible: null,
  shareDraftNow:        false,
};

interface WizardStep {
  key:         string;
  label:       string;
  description: string;
}

const ALL_STEPS: WizardStep[] = [
  { key: 'catalog',  label: 'Scope',         description: 'Choose the work items'  },
  { key: 'location', label: 'Location',      description: 'Where is the work'      },
  { key: 'reason',   label: 'Reason',        description: 'Cause of this change'   },
  { key: 'config',   label: 'Configuration', description: 'Pricing and assignment'  },
];

interface COWizardProps {
  open:         boolean;
  onOpenChange: (open: boolean) => void;
  projectId:    string;
}

export function COWizard({ open, onOpenChange, projectId }: COWizardProps) {
  const { currentRole } = useAuth();
  const isMobile = useIsMobile();
  const [step, setStep]   = useState(0);
  const [data, setData]   = useState<COWizardData>(INITIAL_DATA);
  const [submitting, setSubmitting] = useState(false);

  const role: COCreatedByRole =
    currentRole === 'GC_PM' ? 'GC' :
    currentRole === 'TC_PM' ? 'TC' : 'FC';

  function update(patch: Partial<COWizardData>) {
    setData(prev => ({ ...prev, ...patch }));
  }

  function canAdvance(): boolean {
    const s = ALL_STEPS[step];
    if (s.key === 'catalog')  return data.selectedItems.length > 0;
    if (s.key === 'location') return data.locationTag.trim().length > 0;
    if (s.key === 'reason')   return !!data.reason && (data.reason !== 'other' || data.reasonNote.trim().length > 0);
    if (s.key === 'config') {
      if (role === 'GC') return !!data.assignedToOrgId;
      return true;
    }
    return true;
  }

  function handleNext() {
    if (step < ALL_STEPS.length - 1) {
      setStep(s => s + 1);
    }
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      console.log('CO wizard submit — data:', data, 'role:', role, 'project:', projectId);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setStep(0);
    setData(INITIAL_DATA);
    onOpenChange(false);
  }

  const currentStep = ALL_STEPS[step];
  const isLastStep  = step === ALL_STEPS.length - 1;

  const body = (
    <div className="flex flex-col h-full">
      {/* Mobile progress bar */}
      {isMobile && (
        <div className="px-4 pt-4 pb-3 border-b">
          <p className="text-xs text-muted-foreground mb-2">
            Step {step + 1} of {ALL_STEPS.length}
          </p>
          <div className="flex gap-1.5">
            {ALL_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i <= step ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
          <h3 className="text-base font-semibold mt-3">{currentStep.label}</h3>
          <p className="text-xs text-muted-foreground">{currentStep.description}</p>
        </div>
      )}

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        {!isMobile && (
          <nav className="w-52 shrink-0 border-r p-3 space-y-1">
            {ALL_STEPS.map((s, i) => {
              const done   = i < step;
              const active = i === step;
              const locked = i > step;
              return (
                <button
                  key={s.key}
                  onClick={() => !locked && setStep(i)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors w-full',
                    active && 'bg-primary/10 text-foreground font-medium',
                    done   && 'text-foreground hover:bg-muted/50 cursor-pointer',
                    locked && 'text-muted-foreground/40 cursor-not-allowed'
                  )}
                >
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                    (done || active) ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  )}>
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {s.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        )}

        {/* Content area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {!isMobile && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{currentStep.label}</h3>
                <p className="text-sm text-muted-foreground">{currentStep.description}</p>
              </div>
            )}

            {currentStep.key === 'catalog' && (
              <StepCatalog data={data} onChange={update} />
            )}
            {currentStep.key === 'location' && (
              <StepLocation data={data} onChange={update} projectId={projectId} />
            )}
            {(currentStep.key === 'reason' || currentStep.key === 'config') && (
              <div className="text-sm text-muted-foreground py-8 text-center">
                Step content for "{currentStep.label}" coming in next prompt.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-4 sm:px-6 py-3">
            <Button variant="ghost" size="sm" onClick={step === 0 ? handleClose : handleBack}>
              {step === 0 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </>
              )}
            </Button>

            {isLastStep ? (
              <Button size="sm" onClick={handleSubmit} disabled={submitting || !canAdvance()}>
                {submitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Create Change Order
              </Button>
            ) : (
              <Button size="sm" onClick={handleNext} disabled={!canAdvance()}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent side="bottom" className="h-[92vh] p-0 rounded-t-2xl">
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[85vh]">
        <DialogDescription className="sr-only">
          Create a new change order
        </DialogDescription>
        {/* Desktop header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">New Change Order</h2>
            <p className="text-xs text-muted-foreground">
              {role} · Step {step + 1} of {ALL_STEPS.length}
            </p>
          </div>
          <div className="flex gap-1.5">
            {ALL_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  'w-8 h-1 rounded-full transition-colors',
                  i <= step ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {body}
        </div>
      </DialogContent>
    </Dialog>
  );
}
