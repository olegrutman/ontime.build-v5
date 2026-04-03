import { useMemo } from 'react';
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
    const fcCollabName = currentCollaborator?.organization?.name ?? 'Field crew';

    const canRequestFCInput = !!co && isTC && (
      (co.assigned_to_org_id === myOrgId && ['shared', 'rejected', 'work_in_progress', 'closed_for_pricing'].includes(co.status)) ||
      (co.org_id === myOrgId && co.status === 'draft')
    );
    const canCompleteFCInput = !!co && isFC && isCollaboratorOrg;

    const isActiveStatus = ['draft', 'shared', 'work_in_progress', 'closed_for_pricing', 'submitted'].includes(co?.status ?? '');
    const isRunningPricing = co?.pricing_type === 'tm' || co?.pricing_type === 'nte';
    const baseCanEdit = (isActiveStatus || (isRunningPricing && co?.status === 'submitted')) && (isGC || isTC || isFC);
    // Bug 15: FC must be an active collaborator before they can edit
    const canEdit = baseCanEdit && (!isFC || isCollaboratorOrg);
    const nteBlocked = co?.pricing_type === 'nte' && !!co?.nte_cap && (financials.nteUsedPercent ?? 0) >= 100;

    const VALID = ['fixed', 'tm', 'nte'];
    const pricingType = co && VALID.includes(co.pricing_type) ? co.pricing_type as 'fixed' | 'tm' | 'nte' : 'fixed';

    return {
      isGC, isTC, isFC, role, myOrgId, myOrgName,
      canEdit, canRequestFCInput, canCompleteFCInput, nteBlocked, pricingType,
      collaboratorOrgIds, currentCollaborator, fcCollabName, isCollaboratorOrg,
    };
  }, [co, collaborators, financials, currentRole, userOrgRoles]);
}
