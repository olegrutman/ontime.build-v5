import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateCONumber } from '@/lib/generateCONumber';
import type { PickerItem } from './types';
import { itemLaborTotal, itemMaterialTotal, itemEquipmentTotal } from './types';

import { usePickerState } from './usePickerState';
import { PickerStepper } from './PickerStepper';
import { PickerAside } from './PickerAside';
import { CORoleSwitcher } from './CORoleSwitcher';
import { StepWhere } from './StepWhere';
import { StepWhy } from './StepWhy';
import { StepWho } from './StepWho';
import { StepPricing } from './StepPricing';
import { StepWork } from './StepWork';
import { StepScope } from './StepScope';
import { StepMaterialsEquipment } from './StepMaterialsEquipment';
import { StepTotal } from './StepTotal';
import { StepReview } from './StepReview';
import type { COCreatedByRole } from '@/types/changeOrder';

interface PickerShellProps {
  projectId: string;
}

export function PickerShell({ projectId }: PickerShellProps) {
  const navigate = useNavigate();
  const { userOrgRoles } = useAuth();

  // Resolve current user's role
  const detectedRole: COCreatedByRole = (() => {
    const membership = userOrgRoles[0];
    const orgType = membership?.organization?.type;
    if (orgType === 'GC') return 'GC';
    if (orgType === 'FC') return 'FC';
    return 'TC';
  })();

  const [state, dispatch] = usePickerState(detectedRole);

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

  const cur = state.items[state.currentItemIndex];

  const handleStepClick = useCallback((step: number) => {
    dispatch({ type: 'SET_STEP', step });
  }, [dispatch]);

  const handleNext = useCallback(() => {
    if (state.step < 9) dispatch({ type: 'SET_STEP', step: state.step + 1 });
  }, [state.step, dispatch]);

  const handleBack = useCallback(() => {
    if (state.step > 1) dispatch({ type: 'SET_STEP', step: state.step - 1 });
  }, [state.step, dispatch]);

  const handleSwitchItem = useCallback((idx: number) => {
    dispatch({ type: 'SWITCH_ITEM', index: idx });
  }, [dispatch]);

  const handleAddItem = useCallback(() => {
    dispatch({ type: 'ADD_ITEM' });
  }, [dispatch]);

  const handleSubmit = useCallback(() => {
    dispatch({ type: 'SET_SUBMITTED' });
    toast.success(`${cur.docType} submitted successfully`);
    // In real implementation, create the CO in the database here
  }, [dispatch, cur.docType]);

  const handleRoleSwitch = useCallback((role: COCreatedByRole) => {
    // For demo purposes only — in production, role is derived from auth
  }, []);

  const stepContent = (() => {
    switch (state.step) {
      case 1: return <StepWhere state={state} dispatch={dispatch} projectId={projectId} />;
      case 2: return <StepWhy state={state} dispatch={dispatch} />;
      case 3: return <StepWho state={state} dispatch={dispatch} projectId={projectId} />;
      case 4: return <StepPricing state={state} dispatch={dispatch} />;
      case 5: return <StepWork state={state} dispatch={dispatch} />;
      case 6: return <StepScope state={state} dispatch={dispatch} />;
      case 7: return <StepMaterialsEquipment state={state} dispatch={dispatch} />;
      case 8: return <StepTotal state={state} dispatch={dispatch} onAddItem={handleAddItem} onGoReview={() => dispatch({ type: 'SET_STEP', step: 9 })} />;
      case 9: return <StepReview state={state} dispatch={dispatch} onSwitchItem={handleSwitchItem} onAddItem={handleAddItem} />;
      default: return null;
    }
  })();

  if (state.submitted) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-4xl mx-auto mb-5 animate-scale-in">
            ✓
          </div>
          <h1 className="font-heading text-3xl font-extrabold text-foreground mb-2">
            {cur.docType === 'CO' ? 'Change Order' : 'Work Order'} Submitted
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Routed for approval. You'll get a notification when it's signed.
          </p>
          <div className="font-mono text-sm font-semibold bg-amber-50 border border-amber-400 rounded-lg px-4 py-2 inline-block mb-6">
            {cur.docType}-DRAFT · {projectInfo?.name ?? 'Project'}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate(`/project/${projectId}/change-orders`)}
              className="px-5 py-2.5 rounded-lg bg-muted border text-sm font-semibold hover:bg-amber-50 transition-all"
            >
              Back to List
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-lg bg-[hsl(var(--navy))] text-white text-sm font-semibold hover:opacity-90 transition-all"
            >
              Start Another
            </button>
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
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[0.7rem] text-muted-foreground">
              <span className="font-semibold text-foreground/80">{projectInfo?.name ?? 'Project'}</span> › {cur.docType === 'CO' ? 'Change Orders' : 'Work Orders'} › New
            </p>
            <p className="font-heading text-[1.35rem] font-extrabold text-foreground leading-none tracking-tight">
              New {cur.docType === 'CO' ? 'Change Order' : 'Work Order'}
            </p>
          </div>
          <div className="flex-shrink-0">
            <CORoleSwitcher activeRole={state.role} onSwitch={handleRoleSwitch} />
          </div>
        </header>

        {/* Stepper */}
        <PickerStepper currentStep={state.step} onStepClick={handleStepClick} />

        {/* Item context strip */}
        {state.items.length > 1 && state.step < 9 && (
          <div className="flex items-center gap-2.5 mx-6 mt-2.5 mb-0 px-3 py-2 bg-gradient-to-r from-amber-50 to-transparent border-l-[3px] border-amber-400 rounded-lg">
            <span className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1px]">
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
        />
      </div>

      {/* Mobile bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t px-4 py-3 flex items-center justify-between gap-3 z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        <span className="text-[0.72rem] text-muted-foreground">
          Step <span className="font-bold text-foreground">{state.step}</span> of 9
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
          {state.step === 9 ? (
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-lg text-[0.85rem] font-bold bg-green-600 text-white"
            >
              ✓ Submit
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-lg text-[0.85rem] font-bold bg-amber-500 text-white"
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
