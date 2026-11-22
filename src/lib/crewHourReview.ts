import { itemLaborPricingMethod, type ItemLaborPricingFields } from '@/lib/coItemLaborPricingMethod';

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

export interface CrewUpstreamPricingEntry extends CrewHourReviewFields {
  co_line_item_id?: string | null;
  org_id?: string | null;
  line_total?: number | null;
}

/** Overall crew approval is separate from upstream pricing readiness. */
export function crewUpstreamPricingError(
  items: readonly ItemLaborPricingFields[],
  entries: readonly CrewUpstreamPricingEntry[],
  upstreamBillerOrgId: string,
  orderUseCrewPricing = true,
): string | null {
  if (items.length === 0) return 'Add at least one scope item before sending this order upstream.';
  const crewItemIds = new Set(items
    .filter(item => itemLaborPricingMethod(item, orderUseCrewPricing) === 'crew')
    .map(item => item.id));
  if (entries.some(entry => entry.co_line_item_id != null
    && crewItemIds.has(entry.co_line_item_id)
    && entry.entered_by_role === 'FC' && !entry.is_actual_cost && entry.crew_review_status === 'pending')) {
    return 'Review every crew time entry before sending this order upstream.';
  }
  const unpricedCount = items.filter(item => !entries.some(entry =>
    entry.co_line_item_id === item.id
    && entry.org_id === upstreamBillerOrgId
    && entry.entered_by_role === 'TC'
    && !entry.is_actual_cost
    && Number.isFinite(Number(entry.line_total))
    && Number(entry.line_total) !== 0,
  )).length;
  if (unpricedCount > 0) {
    return `Confirm a non-zero price for ${unpricedCount === 1 ? 'the scope item' : `all ${unpricedCount} scope items`} before sending this order upstream.`;
  }
  return null;
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
