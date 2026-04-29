import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { COCreatedByRole, COCollaborator, COFinancials, ChangeOrder } from '@/types/changeOrder';

interface UseCORoleContextResult {
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  role: COCreatedByRole;
  myOrgId: string;
  myOrgName: string;
  canEdit: boolean;
  /** Editable until this CO is submitted upstream (or per-party freeze applies). */
  canEditExternal: boolean;
  /** Editable until this CO is finalized (approved / rejected / contracted). */
  canEditInternal: boolean;
  canRequestFCInput: boolean;
  canCompleteFCInput: boolean;
  nteBlocked: boolean;
  pricingType: 'fixed' | 'tm' | 'nte';
  collaboratorOrgIds: Set<string>;
  currentCollaborator: COCollaborator | null;
  fcCollabName: string;
  isCollaboratorOrg: boolean;
}

export function useCORoleContext(
  co: ChangeOrder | null,
  collaborators: COCollaborator[],
  financials: COFinancials,
): UseCORoleContextResult {
  const { currentRole, userOrgRoles } = useAuth();

  // For FC-created COs with no collaborators, resolve the FC org name
  const isFCCreatedCO = co?.created_by_role === 'FC';
  const fcCreatorOrgId = isFCCreatedCO ? co?.org_id : null;
  const needsFCOrgLookup = !!fcCreatorOrgId && collaborators.length === 0;

  const { data: fcCreatorOrg } = useQuery({
    queryKey: ['fc-creator-org', fcCreatorOrgId],
    enabled: needsFCOrgLookup,
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', fcCreatorOrgId!)
        .single();
      return data;
    },
  });

  return useMemo(() => {
    const activeMembership =
      userOrgRoles.find(({ organization_id }) => organization_id === co?.assigned_to_org_id) ??
      userOrgRoles.find(({ organization_id }) => organization_id === co?.org_id) ??
      userOrgRoles[0];

    const activeRole = activeMembership?.role ?? currentRole;
    const activeOrgType = activeMembership?.organization?.type;
    const isFC = activeOrgType === 'FC' || activeRole === 'FC_PM';
    const isGC = activeOrgType === 'GC' || activeRole === 'GC_PM';
    const isTC = !isGC && !isFC && (activeOrgType === 'TC' || activeRole === 'TC_PM' || activeRole === 'FS');
    const role: COCreatedByRole = isGC ? 'GC' : isTC ? 'TC' : 'FC';
    const myOrgId = activeMembership?.organization_id ?? co?.assigned_to_org_id ?? co?.org_id ?? '';
    const myOrgName = activeMembership?.organization?.name ?? role;

    const collaboratorOrgIds = new Set(collaborators.map(c => c.organization_id));
    const currentCollaborator = collaborators.find(c => c.status === 'active') ?? null;
    const isCollaboratorOrg = collaborators.some(c => c.organization_id === myOrgId && c.status === 'active');
    
    // Resolve FC name: from active collaborator, any collaborator, FC creator org, or fallback
    const fcCollabName =
      currentCollaborator?.organization?.name ??
      collaborators[0]?.organization?.name ??
      fcCreatorOrg?.name ??
      'Field crew';

    const canRequestFCInput = !!co && isTC && (
      ((co.assigned_to_org_id === myOrgId || co.org_id === myOrgId) &&
        ['shared', 'rejected', 'work_in_progress', 'closed_for_pricing'].includes(co.status)) ||
      (co.org_id === myOrgId && co.status === 'draft')
    );
    const canCompleteFCInput = !!co && isFC && isCollaboratorOrg;

    const isActiveStatus = ['draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'submitted'].includes(co?.status ?? '');
    const isRunningPricing = co?.pricing_type === 'tm' || co?.pricing_type === 'nte';
    const baseCanEdit = (isActiveStatus || (isRunningPricing && co?.status === 'submitted')) && (isGC || isTC || isFC);
    // Bug 15: FC must be an active collaborator OR the CO creator before they can edit
    const isFCCreator = isFC && co?.org_id === myOrgId;
    const canEdit = baseCanEdit && (!isFC || isCollaboratorOrg || isFCCreator);
    const nteBlocked = co?.pricing_type === 'nte' && !!co?.nte_cap && (financials.nteUsedPercent ?? 0) >= 100;

    // External (billable / upstream-facing) edits — locked once the CO is submitted upstream
    // or once a per-party pricing freeze applies.
    const finalStatuses = ['approved', 'rejected', 'contracted'];
    const submittedOrFinal = ['submitted', ...finalStatuses].includes(co?.status ?? '');
    const tcFrozen = co?.tc_submitted_price != null;
    const fcFrozen = co?.fc_pricing_submitted_at != null;
    const externalFrozenForRole =
      isFC ? (fcFrozen || submittedOrFinal)
      : isTC ? (tcFrozen || submittedOrFinal)
      : submittedOrFinal;
    const canEditExternal =
      !!co && (isGC || isTC || isFC) && !externalFrozenForRole && (!isFC || isCollaboratorOrg || isFCCreator);

    // Internal (private cost) edits — locked only when CO reaches a final state.
    const canEditInternal =
      !!co && (isGC || isTC || isFC) && !finalStatuses.includes(co?.status ?? '') && (!isFC || isCollaboratorOrg || isFCCreator);

    const VALID = ['fixed', 'tm', 'nte'];
    const pricingType = co && VALID.includes(co.pricing_type) ? co.pricing_type as 'fixed' | 'tm' | 'nte' : 'fixed';

    return {
      isGC, isTC, isFC, role, myOrgId, myOrgName,
      canEdit, canEditExternal, canEditInternal,
      canRequestFCInput, canCompleteFCInput, nteBlocked, pricingType,
      collaboratorOrgIds, currentCollaborator, fcCollabName, isCollaboratorOrg,
    };
  }, [co, collaborators, financials, currentRole, userOrgRoles, fcCreatorOrg]);
}
