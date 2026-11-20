import type { ChangeOrder } from '@/types/changeOrder';

type InternalApprovalOrder = Pick<ChangeOrder,
  'status' | 'created_by_role' | 'org_id' | 'assigned_to_org_id' | 'kept_internal'
>;

const PRE_UPSTREAM_STATUSES = ['draft', 'shared', 'work_in_progress', 'closed_for_pricing'] as const;

/** Internal self-approval never approves the upstream contract. */
export function canApproveOwnOrderInternally(
  co: InternalApprovalOrder | null,
  isTC: boolean,
  currentOrgId: string,
): boolean {
  return !!co && isTC && co.created_by_role === 'TC' && co.org_id === currentOrgId
    && !co.kept_internal
    && [...PRE_UPSTREAM_STATUSES, 'submitted'].includes(co.status);
}

export function isOwnOrderInternallyApproved(
  co: InternalApprovalOrder | null,
  isTC: boolean,
  currentOrgId: string,
): boolean {
  return !!co && isTC && co.created_by_role === 'TC' && co.org_id === currentOrgId
    && co.kept_internal === true
    && PRE_UPSTREAM_STATUSES.includes(co.status as typeof PRE_UPSTREAM_STATUSES[number]);
}

interface ReturnedOrderViewer {
  isGC: boolean;
  isTC: boolean;
  isFC: boolean;
  myOrgId: string;
}

/** A returned crew order must be editable by the party expected to fix it. */
export function canFixReturnedCrewOrder(
  co: InternalApprovalOrder | null,
  viewer: ReturnedOrderViewer,
): boolean {
  if (!co || co.created_by_role !== 'FC' || co.status !== 'rejected' || viewer.isGC) return false;
  if (viewer.isFC) return co.org_id === viewer.myOrgId;
  return viewer.isTC && (co.assigned_to_org_id === viewer.myOrgId || co.org_id === viewer.myOrgId);
}
