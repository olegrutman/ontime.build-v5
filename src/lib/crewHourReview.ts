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
