/**
 * Who may remove a labor / internal-cost entry on a CO/WO line item.
 *
 * Rules:
 * - only the org (and role) that entered the line may remove it
 * - an entry already on a live (non-rejected) invoice can never be removed
 * - T&M / NTE billable lines stay removable while unbilled, even after approval
 * - other billable lines follow the external edit window (open until submitted upstream)
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
  pricingType?: string | null;
  billed?: boolean;
}

export function canRemoveLaborEntry(i: LaborEntryRemovalInput): boolean {
  if (!i.myRole || !i.myOrgId) return false;
  if (i.entryRole !== i.myRole) return false;
  if (i.entryOrgId !== i.myOrgId) return false;
  if (i.billed) return false;
  if (i.isActualCost) return i.canEditInternal;
  if (i.pricingType === 'tm' || i.pricingType === 'nte') return true;
  return i.canEditExternal;
}
