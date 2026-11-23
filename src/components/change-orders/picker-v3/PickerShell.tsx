import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRoleLabelsContext } from '@/contexts/RoleLabelsContext';
import { useCORoutingTargets } from '@/hooks/useCORoutingTargets';

import { usePickerState } from './usePickerState';
import { PickerStepper } from './PickerStepper';
import { PickerAside } from './PickerAside';

import { StepLocation } from './StepLocation';
import { StepSystem } from './StepSystem';
import { StepScope } from './StepScope';
import { StepCause } from './StepCause';
import { StepPricingAndRouting } from './StepPricingAndRouting';
import { StepReview } from './StepReview';
import { PICKER_STEPS, REVIEW_STEP } from './types';
import { completedPickerSteps, pickerStepError } from './pickerFlow';
import { savePickerOrder } from './savePickerOrder';
import type { COCreatedByRole } from '@/types/changeOrder';

interface PickerShellProps {
  projectId: string;
  addToCoId?: string;
}

export function PickerShell({ projectId, addToCoId }: PickerShellProps) {
  const isAddMode = !!addToCoId;
  const navigate = useNavigate();
  const { userOrgRoles, user } = useAuth();
  const queryClient = useQueryClient();
  const rl = useRoleLabelsContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Resolve current user's role using project participant context
  const { data: myParticipant } = useQuery({
    queryKey: ['my-project-participant', projectId],
    queryFn: async () => {
      const orgId = userOrgRoles?.[0]?.organization_id;
      if (!orgId) return null;
      const { data } = await supabase
        .from('project_participants')
        .select('role, organization_id, organization:organizations(id, name, type)')
        .eq('project_id', projectId)
        .eq('organization_id', orgId)
        .eq('invite_status', 'ACCEPTED')
        .maybeSingle();
      return data;
    },
    enabled: !!projectId && !!userOrgRoles?.length,
  });

  const detectedRole: COCreatedByRole = (() => {
    if (myParticipant?.role === 'GC') return 'GC';
    if (myParticipant?.role === 'FC') return 'FC';
    return 'TC';
  })();

  const orgId = (myParticipant?.organization_id ?? userOrgRoles?.[0]?.organization_id) as string;

  const [state, dispatch] = usePickerState(detectedRole);
  const { data: routing } = useCORoutingTargets(projectId);

  // Sync detected role into state when async query resolves
  useEffect(() => {
    if (detectedRole && detectedRole !== state.role) {
      dispatch({ type: 'SET_ROLE', role: detectedRole });
    }
  }, [detectedRole, dispatch]);

  const { data: projectInfo } = useQuery({
    queryKey: ['project-basic-info', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('name, status, contract_mode')
        .eq('id', projectId)
        .single();
      return data;
    },
    enabled: !!projectId,
    staleTime: Infinity,
  });

  // Fetch existing CO when in add mode
  const { data: existingCO } = useQuery({
    queryKey: ['co-for-add', addToCoId],
    queryFn: async () => {
      const { data } = await supabase
        .from('change_orders')
        .select('id, co_number, title, location_tag, reason, pricing_type, org_id, assigned_to_org_id')
        .eq('id', addToCoId!)
        .single();
      return data;
    },
    enabled: isAddMode && !!addToCoId,
    staleTime: Infinity,
  });

  const { data: parties = [] } = useQuery({
    queryKey: ['picker-project-parties', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_participants')
        .select('organization_id, role, organization:organizations!project_participants_organization_id_fkey(id, name, type)')
        .eq('project_id', projectId)
        .eq('invite_status', 'ACCEPTED');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const isTM = projectInfo?.contract_mode === 'tm';
  const cur = state.items[state.currentItemIndex];
  const assignedToOrgId = detectedRole === 'GC' ? state.collaboration.assignedTcOrgId : routing?.defaultId ?? null;
  const hasUpstreamTarget = !!assignedToOrgId;
  const partyName = (type: 'GC' | 'TC' | 'FC') => {
    const party = parties.find(row => (row.organization as { type?: string } | null)?.type === type);
    return (party?.organization as { name?: string } | null)?.name;
  };
  const selectedTc = parties.find(row => row.organization_id === state.collaboration.assignedTcOrgId);
  const selectedFc = parties.find(row => row.organization_id === state.collaboration.assignedFcOrgId);
  const tcName = (selectedTc?.organization as { name?: string } | null)?.name ?? routing?.targets[0]?.name ?? partyName('TC');
  const fcName = (selectedFc?.organization as { name?: string } | null)?.name ?? partyName('FC');
  const gcName = partyName('GC');

  const completedSteps = completedPickerSteps(state, hasUpstreamTarget);
  const canSubmit = !pickerStepError(state, REVIEW_STEP, hasUpstreamTarget);

  const handleStepClick = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', step });
  }, [dispatch]);

  const handleNext = useCallback(() => {
    const error = pickerStepError(state, state.step, hasUpstreamTarget);
    if (error) {
      toast.error(error);
      return;
    }
    if (state.step < REVIEW_STEP) dispatch({ type: 'SET_STEP', step: state.step + 1 });
  }, [state, hasUpstreamTarget, dispatch]);

  const handleBack = useCallback(() => {
    if (state.step > 1) dispatch({ type: 'SET_STEP', step: state.step - 1 });
  }, [state.step, dispatch]);

  const handleSwitchItem = useCallback((idx: number) => {
    dispatch({ type: 'SWITCH_ITEM', index: idx });
  }, [dispatch]);

  const handleAddItem = useCallback(() => {
    dispatch({ type: 'ADD_ITEM' });
  }, [dispatch]);

  const handleSubmit = useCallback(async () => {
    if (!user || !orgId || isSubmitting) return;
    if (state.step !== REVIEW_STEP) {
      toast.error('Open Review before creating the order.');
      return;
    }
    const validationError = pickerStepError(state, REVIEW_STEP, hasUpstreamTarget);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setIsSubmitting(true);
    try {
      const coIds = await savePickerOrder({
        projectId,
        addToCoId,
        state,
        detectedRole,
        orgId,
        assignedToOrgId,
        isTM,
      });
      queryClient.invalidateQueries({ queryKey: ['co-detail'] });
      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });
      const totalItems = state.items.length;
      toast.success(isAddMode ? `${totalItems} item(s) added` : `${cur.docType === 'WO' ? 'Work Order' : 'Change Order'} created successfully`);
      const destinationId = isAddMode ? addToCoId : coIds[0];
      navigate(`/project/${projectId}/change-orders/${destinationId}`, { replace: true });
    } catch (err: any) {
      console.error('Failed to save:', err);
      toast.error(err?.message ?? 'Nothing was saved. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, orgId, isSubmitting, state, hasUpstreamTarget, projectId, addToCoId, detectedRole, assignedToOrgId, isTM, queryClient, isAddMode, cur.docType, navigate]);

  const stepContent = (() => {
    switch (state.step) {
      case 1: return <StepLocation state={state} dispatch={dispatch} projectId={projectId} />;
      case 2: return <StepSystem state={state} dispatch={dispatch} />;
      case 3: return <StepScope state={state} dispatch={dispatch} />;
      case 4: return <StepCause state={state} dispatch={dispatch} />;
      case 5: return <StepPricingAndRouting state={state} dispatch={dispatch} projectId={projectId} gcName={gcName} />;
      case 6: return <StepReview state={state} dispatch={dispatch} onSwitchItem={handleSwitchItem} onAddItem={handleAddItem} tcName={tcName} fcName={fcName} gcName={gcName} />;
      default: return null;
    }
  })();

  if (state.submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-state-approved-bg text-state-approved flex items-center justify-center text-4xl mx-auto mb-5 animate-scale-in">
            ✓
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-foreground mb-2">
            {isAddMode ? 'Items Added' : `${cur.docType === 'CO' ? 'Change Order' : 'Work Order'} Created`}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {isAddMode
              ? 'Scope items have been added to the existing order.'
              : 'Your draft is ready for review. Open it to add details, pricing, and submit for approval.'}
          </p>
          {!isAddMode && (
            <div className="font-mono text-sm font-semibold bg-state-open-bg border border-state-open rounded-lg px-4 py-2 inline-block mb-6">
              {cur.docType}-DRAFT · {projectInfo?.name ?? 'Project'}
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate(isAddMode
                ? `/project/${projectId}/change-orders/${addToCoId}`
                : `/project/${projectId}/change-orders`
              )}
              className="px-5 py-2.5 rounded-lg bg-muted border text-sm font-semibold hover:bg-state-open-bg transition-all"
            >
              {isAddMode ? 'Back to Order' : 'Back to List'}
            </button>
            {!isAddMode && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-lg bg-[hsl(var(--navy))] text-white text-sm font-semibold hover:opacity-90 transition-all"
              >
                Start Another
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1fr_340px] min-h-screen max-lg:grid-cols-1">
      {/* Main */}
      <div className="flex flex-col bg-muted/30 min-h-screen overflow-x-hidden">
        {/* Topbar */}
        <header className="bg-background border-b px-6 py-3 flex items-center gap-3.5 sticky top-0 z-10 shadow-xs">
          <button
            type="button"
            onClick={() => navigate(isAddMode
              ? `/project/${projectId}/change-orders/${addToCoId}`
              : `/project/${projectId}/change-orders`
            )}
            className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:bg-state-open-bg hover:border-state-open hover:text-state-open-foreground transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[0.7rem] text-muted-foreground">
              <span className="font-semibold text-foreground/80">{projectInfo?.name ?? 'Project'}</span> › {cur.docType === 'CO' ? 'Change Orders' : 'Work Orders'} › {isAddMode ? `${existingCO?.co_number ?? 'Order'} › Add Items` : 'New'}
            </p>
            <p className="font-heading text-[1.35rem] font-extrabold text-foreground leading-none tracking-tight">
              {isAddMode ? `Add Items to ${existingCO?.co_number ?? 'Order'}` : `New ${cur.docType === 'CO' ? 'Change Order' : 'Work Order'}`}
            </p>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border">
            <span className={`w-2 h-2 rounded-full ${detectedRole === 'GC' ? 'bg-type-sov' : detectedRole === 'FC' ? 'bg-state-open' : 'bg-state-approved'}`} />
            <span className="text-[0.72rem] font-semibold text-muted-foreground">{isAddMode ? 'Adding as' : 'Creating as'} {(myParticipant?.organization as { name?: string } | null)?.name ?? rl[detectedRole]}</span>
          </div>
        </header>

        {/* Stepper */}
        <PickerStepper currentStep={state.step} onStepClick={handleStepClick} completedSteps={completedSteps} />

        {/* Item context strip */}
        {state.items.length > 1 && state.step < 4 && (
          <div className="flex items-center gap-2.5 mx-6 mt-2.5 mb-0 px-3 py-2 bg-gradient-to-r from-amber-50 to-transparent border-l-[3px] border-state-open rounded-lg">
            <span className="text-[0.6rem] font-bold text-state-open-foreground uppercase tracking-[1px]">
              Editing Item
            </span>
            <span className="font-heading font-extrabold text-[0.95rem] text-foreground">
              Item {state.currentItemIndex + 1}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 pb-24">
          <div className="animate-fade-in">
            {stepContent}
          </div>
        </div>
      </div>

      {/* Aside — hidden on mobile */}
      <div className="max-lg:hidden">
        <PickerAside
          state={state}
          onSwitchItem={handleSwitchItem}
          onAddItem={handleAddItem}
          onBack={handleBack}
          onNext={handleNext}
          onSubmit={handleSubmit}
          canGoBack={state.step > 1}
          canSubmit={canSubmit}
          isSubmitting={isSubmitting}
        />
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-3 flex items-center justify-between gap-3 z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <span className="text-[0.72rem] text-muted-foreground">
          Step <span className="font-bold text-foreground">{state.step}</span> of {PICKER_STEPS.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleBack}
            disabled={state.step <= 1}
            className="px-4 py-2.5 rounded-lg text-[0.85rem] font-bold bg-muted border text-muted-foreground disabled:opacity-40"
          >
            ← Back
          </button>
          {state.step === REVIEW_STEP ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !canSubmit}
              className="px-5 py-2.5 rounded-lg text-[0.85rem] font-bold bg-state-approved text-white disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : '✓ Create'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-lg text-[0.85rem] font-bold bg-state-open text-white"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
