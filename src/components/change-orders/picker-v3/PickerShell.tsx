import { useCallback, useEffect, useMemo, useState } from 'react';
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
  addToCoId?: string;
}

export function PickerShell({ projectId }: PickerShellProps) {
  const navigate = useNavigate();
  const { userOrgRoles, user } = useAuth();
  const queryClient = useQueryClient();
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

  // Sync detected role into state when async query resolves
  useEffect(() => {
    if (detectedRole && detectedRole !== state.role) {
      dispatch({ type: 'SET_ROLE', role: detectedRole });
    }
  }, [detectedRole, dispatch]); // intentionally omit state.role to avoid loops

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

  const isTM = projectInfo?.contract_mode === 'tm';
  const cur = state.items[state.currentItemIndex];

  // Compute completed steps for the stepper
  const completedSteps = useMemo(() => {
    const done = new Set<number>();
    if (cur.locations.length > 0) done.add(1);
    if (cur.causeId) done.add(2);
    // Step 3 (Who) is always "done" for TC/FC (auto-routed)
    if (detectedRole !== 'GC' || state.collaboration.assignedTcOrgId) done.add(3);
    if (cur.pricingType) done.add(4); // always has a default
    if (cur.workTypes.size > 0) done.add(5);
    if (cur.narrative || cur.causeId) done.add(6); // auto-generated narrative counts
    done.add(7); // Materials/Equipment is optional
    done.add(8); // Total is always viewable
    return done;
  }, [cur, detectedRole, state.collaboration.assignedTcOrgId]);

  const canSubmit = cur.locations.length > 0 && !!cur.causeId;

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

  const handleSubmit = useCallback(async () => {
    if (!user || !orgId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Determine assigned_to_org_id based on role
      let assignedToOrgId: string | null = null;
      if (detectedRole === 'FC') {
        // FC routes to hiring TC first (upstream contract), not directly to GC
        const { data: upstreamContract } = await supabase
          .from('project_contracts')
          .select('from_org_id')
          .eq('project_id', projectId)
          .eq('to_org_id', orgId)
          .maybeSingle();
        if (upstreamContract?.from_org_id) {
          assignedToOrgId = upstreamContract.from_org_id;
        } else {
          // Fallback: find TC on project
          const { data: tcParticipant } = await supabase
            .from('project_participants')
            .select('organization_id')
            .eq('project_id', projectId)
            .eq('role', 'TC')
            .eq('invite_status', 'ACCEPTED')
            .maybeSingle();
          assignedToOrgId = tcParticipant?.organization_id ?? null;
        }
      } else if (detectedRole === 'TC') {
        // TC routes to GC
        const { data: gcParticipant } = await supabase
          .from('project_participants')
          .select('organization_id')
          .eq('project_id', projectId)
          .eq('role', 'GC')
          .eq('invite_status', 'ACCEPTED')
          .maybeSingle();
        assignedToOrgId = gcParticipant?.organization_id ?? null;
      } else if (state.collaboration.assignedTcOrgId) {
        assignedToOrgId = state.collaboration.assignedTcOrgId;
      }

      // Create one CO per item
      for (const item of state.items) {
        const coNumber = await generateCONumber({
          projectId,
          creatorOrgId: orgId,
          assignedToOrgId,
          isTM: isTM || item.docType === 'WO',
        });

        const locationTag = item.locations.length > 0
          ? item.locations.join(' + ')
          : null;

        const { data: co, error: coError } = await supabase
          .from('change_orders')
          .insert({
            org_id: orgId,
            project_id: projectId,
            created_by_user_id: user.id,
            created_by_role: detectedRole,
            co_number: coNumber,
            title: item.narrative
              ? item.narrative.substring(0, 120)
              : `${item.systemName ?? ''} · ${item.causeName ?? ''}`.trim() || coNumber,
            status: 'draft',
            pricing_type: item.pricingType,
            reason: item.reason ?? 'owner_request',
            reason_note: item.causeName ?? null,
            location_tag: locationTag,
            assigned_to_org_id: assignedToOrgId,
            fc_input_needed: state.collaboration.requestFcInput,
            materials_needed: item.materials.length > 0,
            equipment_needed: item.equipment.length > 0,
            materials_responsible: item.materialResponsible,
            equipment_responsible: item.equipmentResponsible,
          })
          .select()
          .single();

        if (coError) throw coError;

        // Insert line items from work types
        const workTypeEntries = Array.from(item.workTypes);
        let createdLineItemIds: string[] = [];

        if (workTypeEntries.length > 0) {
          const lineItems = workTypeEntries.map((wt, idx) => ({
            co_id: co.id,
            org_id: orgId,
            created_by_role: detectedRole,
            item_name: item.workNames[wt] ?? wt,
            description: item.narrative || null,
            unit: 'EA',
            sort_order: idx + 1,
          }));
          const { data: liData, error: liError } = await supabase
            .from('co_line_items')
            .insert(lineItems)
            .select('id');
          if (liError) console.error('Line items insert error:', liError);
          createdLineItemIds = (liData ?? []).map(li => li.id);
        } else {
          // Create a single line item from the narrative or title
          const { data: liData, error: liError } = await supabase
            .from('co_line_items')
            .insert({
              co_id: co.id,
              org_id: orgId,
              created_by_role: detectedRole,
              item_name: item.narrative?.substring(0, 120) || item.causeName || 'Scope item',
              description: item.narrative || null,
              unit: 'EA',
              sort_order: 1,
            })
            .select('id');
          if (liError) console.error('Line item insert error:', liError);
          createdLineItemIds = (liData ?? []).map(li => li.id);
        }

        // Insert labor entries (linked to first line item)
        const firstLineItemId = createdLineItemIds[0];
        if (firstLineItemId) {
          for (const labor of item.laborEntries) {
            if (labor.hours <= 0) continue;
            await supabase.from('co_labor_entries').insert({
              co_id: co.id,
              org_id: orgId,
              co_line_item_id: firstLineItemId,
              entered_by_role: detectedRole === 'GC' ? 'TC' : detectedRole,
              description: labor.role,
              hourly_rate: labor.rate,
              hours: labor.hours,
              line_total: labor.rate * labor.hours,
              pricing_mode: 'hourly',
              is_actual_cost: false,
            });
          }
        }

        // Insert materials
        for (let mi = 0; mi < item.materials.length; mi++) {
          const mat = item.materials[mi];
          await supabase.from('co_material_items').insert({
            co_id: co.id,
            org_id: orgId,
            added_by_role: detectedRole,
            line_number: mi + 1,
            description: mat.description,
            supplier_sku: mat.sku || null,
            quantity: mat.quantity,
            uom: mat.unit || 'EA',
            unit_cost: mat.unitCost,
            line_cost: mat.unitCost * mat.quantity,
            markup_percent: item.markup,
            markup_amount: (mat.unitCost * mat.quantity * item.markup) / 100,
            billed_amount: mat.unitCost * mat.quantity * (1 + item.markup / 100),
          });
        }

        // Insert equipment
        for (const eq of item.equipment) {
          await supabase.from('co_equipment_items').insert({
            co_id: co.id,
            org_id: orgId,
            added_by_role: detectedRole,
            description: eq.description,
            duration_note: eq.durationNote || null,
            cost: eq.cost,
            markup_percent: item.markup,
            markup_amount: (eq.cost * item.markup) / 100,
            billed_amount: eq.cost * (1 + item.markup / 100),
          });
        }

        // Insert collaborator if FC input requested
        if (state.collaboration.requestFcInput && state.collaboration.assignedFcOrgId) {
          await supabase.from('change_order_collaborators').insert({
            co_id: co.id,
            organization_id: state.collaboration.assignedFcOrgId,
            collaborator_type: 'FC',
            status: 'invited',
            invited_by_user_id: user.id,
          });
        }
      }

      // Invalidate queries so lists refresh
      queryClient.invalidateQueries({ queryKey: ['change-orders', projectId] });

      dispatch({ type: 'SET_SUBMITTED' });
      toast.success(`${cur.docType === 'WO' ? 'Work Order' : 'Change Order'} created successfully`);
    } catch (err: any) {
      console.error('Failed to create CO:', err);
      toast.error(err.message ?? 'Failed to create change order');
    } finally {
      setIsSubmitting(false);
    }
  }, [user, orgId, isSubmitting, detectedRole, projectId, state, cur.docType, isTM, queryClient, dispatch]);


  const stepContent = (() => {
    switch (state.step) {
      case 1: return <StepWhere state={state} dispatch={dispatch} projectId={projectId} />;
      case 2: return <StepWhy state={state} dispatch={dispatch} />;
      case 3: return <StepWho state={state} dispatch={dispatch} projectId={projectId} />;
      case 4: return <StepPricing state={state} dispatch={dispatch} />;
      case 5: return <StepWork state={state} dispatch={dispatch} />;
      case 6: return <StepScope state={state} dispatch={dispatch} />;
      case 7: return <StepMaterialsEquipment state={state} dispatch={dispatch} projectId={projectId} />;
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
            {cur.docType === 'CO' ? 'Change Order' : 'Work Order'} Created
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            Your draft is ready for review. Open it to add details and submit for approval.
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
            onClick={() => navigate(`/project/${projectId}/change-orders`)}
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
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border">
            <span className={`w-2 h-2 rounded-full ${detectedRole === 'GC' ? 'bg-blue-600' : detectedRole === 'FC' ? 'bg-amber-500' : 'bg-green-600'}`} />
            <span className="text-[0.72rem] font-semibold text-muted-foreground">Creating as {detectedRole}</span>
          </div>
        </header>

        {/* Stepper */}
        <PickerStepper currentStep={state.step} onStepClick={handleStepClick} completedSteps={completedSteps} />

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
              disabled={isSubmitting || !canSubmit}
              className="px-5 py-2.5 rounded-lg text-[0.85rem] font-bold bg-green-600 text-white disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : '✓ Submit'}
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
