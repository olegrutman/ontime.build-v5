export type CrewReviewStatus = 'pending' | 'approved' | 'rejected';

export interface CrewHourReviewFields {
  entered_by_role?: string | null;
  is_actual_cost?: boolean | null;
  crew_review_status?: string | null;
}

/**
 * Only reviewed crew charges feed new crew-derived prices. NULL identifies a
 * historical entry from before review existed; keep it eligible so adding this
 * feature never rewrites an existing order's economics.
 */
export function canUseCrewEntryForPricing(entry: CrewHourReviewFields): boolean {
  return entry.entered_by_role === 'FC'
    && !entry.is_actual_cost
    && (entry.crew_review_status == null || entry.crew_review_status === 'approved');
}

export function crewPricingEntries<T extends CrewHourReviewFields>(entries: T[]): T[] {
  return entries.filter(canUseCrewEntryForPricing);
}

export function crewReviewDecisionError(decision: 'approved' | 'rejected', note?: string): string | null {
  if (decision === 'rejected' && !note?.trim()) return 'Explain why these crew hours are rejected.';
  return null;
}

export interface CrewBillingOrderFields {
  pricing_type?: string | null;
  status?: string | null;
}

/** Overall approval preserves existing billing; hour approval opens T&M billing earlier. */
export function canCrewBillOrder(order: CrewBillingOrderFields, hasApprovedHours: boolean): boolean {
  if (order.status === 'approved' || order.status === 'contracted') return true;
  return order.pricing_type === 'tm' && hasApprovedHours;
}

/** Pending/rejected hours never bill; legacy entries remain eligible only after overall approval. */
export function canBillCrewLaborEntry(entry: CrewHourReviewFields, order: CrewBillingOrderFields): boolean {
  if (entry.entered_by_role !== 'FC' || entry.is_actual_cost) return false;
  if (order.pricing_type !== 'tm') return true;
  if (entry.crew_review_status === 'approved') return true;
  return entry.crew_review_status == null && (order.status === 'approved' || order.status === 'contracted');
}
