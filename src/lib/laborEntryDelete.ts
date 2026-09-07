/**
 * Who may remove a labor / internal-cost entry on a CO/WO line item.
 *
 * Rules:
 * - only the org (and role) that entered the line may remove it
 * - billable lines follow the external edit window (open until submitted upstream)
 * - internal cost lines follow the internal edit window (open until finalized)
 */
export interface LaborEntryRemovalInput {
  entryRole: string | null;
  entryOrgId: string | null;
  isActualCost: boolean;
  myRole: string | null;
  myOrgId: string | null;
  canEditExternal: boolean;
  canEditInternal: boolean;
}

export function canRemoveLaborEntry(i: LaborEntryRemovalInput): boolean {
  if (!i.myRole || !i.myOrgId) return false;
  if (i.entryRole !== i.myRole) return false;
  if (i.entryOrgId !== i.myOrgId) return false;
  return i.isActualCost ? i.canEditInternal : i.canEditExternal;
}
