import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { COCreatedByRole, COReasonCode, COPricingType, WorkOrderCatalogItem } from '@/types/changeOrder';
import { useChangeOrders } from '@/hooks/useChangeOrders';
import { StepCatalog } from './StepCatalog';
import { StepConfig } from './StepConfig';
import { StepReview } from './StepReview';

export interface SelectedScopeItem extends WorkOrderCatalogItem {
  locationTag: string;
  reason: COReasonCode;
  reasonDescription: string;
}

export interface COWizardData {
  selectedItems: SelectedScopeItem[];
  scopeDescription: string;
  reason: COReasonCode | null;
  reasonNote: string;
  pricingType: COPricingType;
  nteCap: string;
  assignedToOrgId: string;
  fcInputNeeded: boolean;
  materialsNeeded: boolean;
  materialsOnSite: boolean;
  equipmentNeeded: boolean;
  materialsResponsible: 'GC' | 'TC' | null;
  equipmentResponsible: 'GC' | 'TC' | null;
  shareDraftNow: boolean;
}

const INITIAL_DATA: COWizardData = {
  selectedItems: [],
  scopeDescription: '',
  reason: null,
  reasonNote: '',
  pricingType: 'fixed',
  nteCap: '',
  assignedToOrgId: '',
  fcInputNeeded: false,
  materialsNeeded: false,
  materialsOnSite: false,
  equipmentNeeded: false,
  materialsResponsible: null,
  equipmentResponsible: null,
  shareDraftNow: false,
};

interface WizardStep {
  key: string;
  label: string;
  description: string;
}

const ALL_STEPS: WizardStep[] = [
  { key: 'reason', label: 'Reason', description: 'Cause of this change' },
  { key: 'config', label: 'Configuration', description: 'Pricing and assignment' },
  { key: 'catalog', label: 'Scope', description: 'Choose work items & locations' },
  { key: 'review', label: 'Review', description: 'Confirm before creating' },
];

interface COWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function COWizard({ open, onOpenChange, projectId }: COWizardProps) {
  const { currentRole, user, userOrgRoles } = useAuth();
  const isMobile = useIsMobile();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<COWizardData>(INITIAL_DATA);
  const [submitting, setSubmitting] = useState(false);
  const { shareCO } = useChangeOrders(projectId);
  const queryClient = useQueryClient();
  const orgId = userOrgRoles?.[0]?.organization_id ?? null;

  const role: COCreatedByRole =
    currentRole === 'GC_PM' ? 'GC' :
    currentRole === 'TC_PM' ? 'TC' : 'FC';

  function update(patch: Partial<COWizardData>) {
    setData(prev => ({ ...prev, ...patch }));
  }

  function canAdvance(): boolean {
    const s = ALL_STEPS[step];
    if (s.key === 'review') return true;
    if (s.key === 'catalog') return data.selectedItems.length > 0;
    if (s.key === 'reason') return !!data.reason && (data.reason !== 'other' || data.reasonNote.trim().length > 0);
    if (s.key === 'config') {
      if (role === 'GC') {
        if (!data.assignedToOrgId) return false;
        if (data.pricingType === 'nte' && (!data.nteCap || parseFloat(data.nteCap) <= 0)) return false;
        if (data.materialsNeeded && !data.materialsResponsible) return false;
        if (data.equipmentNeeded && !data.equipmentResponsible) return false;
      }
      if (role === 'TC') {
        if (data.pricingType === 'nte' && (!data.nteCap || parseFloat(data.nteCap) <= 0)) return false;
      }
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
    if (!orgId || !user) {
      toast.error('Not authenticated');
      return;
    }
    setSubmitting(true);
    try {
      // Auto-generate CO number
      const { count } = await supabase
        .from('change_orders')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId);
      const seq = (count ?? 0) + 1;
      const coNumber = `CO-${String(seq).padStart(3, '0')}`;
      const title = `${coNumber} · ${format(new Date(), 'MMM d, yyyy')}`;

      const preGeneratedId = crypto.randomUUID();

      // Join unique locations from items for CO-level summary
      const uniqueLocations = [...new Set(data.selectedItems.map(i => i.locationTag).filter(Boolean))];
      const locationTagSummary = uniqueLocations.length > 0 ? uniqueLocations.join(' | ') : null;

      const { error: insertError } = await supabase
        .from('change_orders')
        .insert({
          id: preGeneratedId,
          org_id: orgId,
          project_id: projectId,
          created_by_user_id: user.id,
          created_by_role: role,
          title,
          co_number: coNumber,
          status: 'draft',
          pricing_type: data.pricingType,
          nte_cap: data.pricingType === 'nte' && data.nteCap ? parseFloat(data.nteCap) : null,
          reason: data.reason,
          reason_note: data.reasonNote || null,
          location_tag: locationTagSummary,
          assigned_to_org_id: data.assignedToOrgId || null,
          fc_input_needed: data.fcInputNeeded,
          materials_needed: data.materialsNeeded,
          materials_on_site: data.materialsOnSite,
          equipment_needed: data.equipmentNeeded,
          materials_responsible: data.materialsResponsible,
          equipment_responsible: data.equipmentResponsible,
          draft_shared_with_next: data.shareDraftNow,
          combined_co_id: null,
          parent_co_id: null,
          rejection_note: null,
        });
      if (insertError) throw insertError;

      const newCOId = preGeneratedId;

      if (data.selectedItems.length > 0) {
        const lineItemRows = data.selectedItems.map((item, idx) => ({
          co_id: newCOId,
          org_id: orgId,
          created_by_role: role,
          catalog_item_id: item.id,
          item_name: item.item_name,
          division: item.division,
          category_name: item.category_name,
          unit: item.unit,
          sort_order: idx,
          location_tag: item.locationTag || null,
        }));
        const { error: lineError } = await supabase.from('co_line_items').insert(lineItemRows);
        if (lineError) {
          await supabase.from('change_orders').delete().eq('id', newCOId);
          throw new Error(`Failed to save scope items: ${lineError.message}`);
        }
      }

      const { error: activityError } = await supabase
        .from('co_activity')
        .insert({
          co_id: newCOId,
          project_id: projectId,
          actor_user_id: user.id,
          actor_role: role,
          action: 'created',
          detail: title,
          amount: null,
        });
      if (activityError) throw activityError;

      if (data.shareDraftNow) {
        await shareCO.mutateAsync(newCOId);
      }

      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
      toast.success('Change order created');
      handleClose();
    } catch (err: any) {
      console.error('Failed to create CO:', err);
      toast.error(err?.message ?? 'Failed to create change order');
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
  const isLastStep = step === ALL_STEPS.length - 1;

  const body = (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      {isMobile && (
        <div className="px-4 pt-4 pb-3 border-b co-light-header">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Step {step + 1} of {ALL_STEPS.length}</p>
            <span className="text-[11px] font-medium text-primary">{currentStep.label}</span>
          </div>
          <div className="flex gap-1.5">
            {ALL_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-muted')}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{currentStep.description}</p>
        </div>
      )}

      <div className="flex flex-1 min-h-0">
        {!isMobile && (
          <nav className="w-56 shrink-0 border-r p-3 space-y-1 bg-accent/30">
            {ALL_STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              const locked = i > step;
              return (
                <button
                  key={s.key}
                  onClick={() => !locked && setStep(i)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors w-full',
                    active && 'bg-primary/10 text-foreground font-medium',
                    done && 'text-foreground hover:bg-muted/50 cursor-pointer',
                    locked && 'text-muted-foreground/40 cursor-not-allowed',
                  )}
                >
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0',
                      done || active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate">{s.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.description}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        )}

        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {!isMobile && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{currentStep.label}</h3>
                <p className="text-sm text-muted-foreground">{currentStep.description}</p>
              </div>
            )}

            <div className="co-light-shell p-4 sm:p-5">
              {currentStep.key === 'catalog' && <StepCatalog data={data} onChange={update} projectId={projectId} />}
              {currentStep.key === 'reason' && <StepReason data={data} onChange={update} />}
              {currentStep.key === 'config' && <StepConfig data={data} onChange={update} role={role} projectId={projectId} />}
              {currentStep.key === 'review' && <StepReview data={data} projectId={projectId} />}
            </div>
          </div>

          <div className="flex items-center justify-between border-t bg-card px-4 sm:px-6 py-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={submitting}
              onClick={step === 0 ? handleClose : handleBack}
            >
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
        <SheetContent side="bottom" className="h-[94vh] p-0 rounded-t-2xl overflow-hidden">
          {body}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden max-h-[88vh] flex flex-col">
        <DialogTitle className="sr-only">New Change Order</DialogTitle>
        <DialogDescription className="sr-only">Create a new change order</DialogDescription>
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0 bg-card">
          <div>
            <h2 className="text-lg font-semibold">New Change Order</h2>
            <p className="text-xs text-muted-foreground">{role} · Step {step + 1} of {ALL_STEPS.length}</p>
          </div>
          <div className="flex gap-1.5">
            {ALL_STEPS.map((_, i) => (
              <div
                key={i}
                className={cn('w-9 h-1.5 rounded-full transition-colors', i <= step ? 'bg-primary' : 'bg-muted')}
              />
            ))}
          </div>
        </div>

        {body}
      </DialogContent>
    </Dialog>
  );
}
