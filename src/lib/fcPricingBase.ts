/**
 * Shared "crew input as pricing base" math.
 *
 * When a subcontractor toggles `use_fc_pricing_base` on, the amount they bill
 * upstream is derived from what the crew actually submitted — hours take
 * precedence, lump sum is the fallback — NOT from the work order's pricing
 * label. A fixed-price WO can still be priced from crew hours.
 *
 * Both the on-screen calculation (FCPricingToggleCard) and the submit-time
 * freeze (snapshotCOSubmission) MUST use this function or the frozen price will
 * disagree with what the submitter saw.
 */
export interface FcPricingBaseInput {
  fcTotalHours: number;
  fcLumpSumTotal: number;
  hourlyRate: number;
  markupPercent: number;
  pricingType?: string | null;
}

export interface FcPricingBaseResult {
  isHourly: boolean;
  fcHasSubmitted: boolean;
  calculatedPrice: number;
}

export function computeFcPricingBase({
  fcTotalHours,
  fcLumpSumTotal,
  hourlyRate,
  markupPercent,
  pricingType,
}: FcPricingBaseInput): FcPricingBaseResult {
  const hours = fcTotalHours ?? 0;
  const lumpSum = fcLumpSumTotal ?? 0;
  const isHourly = hours > 0 || (lumpSum <= 0 && (pricingType === 'tm' || pricingType === 'nte'));
  const fcHasSubmitted = hours > 0 || lumpSum > 0;
  const calculatedPrice = isHourly
    ? hours * (hourlyRate ?? 0)
    : lumpSum * (1 + (markupPercent ?? 0) / 100);
  return { isHourly, fcHasSubmitted, calculatedPrice };
}

/**
 * The org that bills the upstream party on this change order.
 *
 * Normally that is the owning org, but when a crew (FC) creates the work order
 * and routes it to their subcontractor, the *assigned* org is the one billing
 * upstream — the creating crew bills its own labor down-line to that
 * subcontractor instead.
 */
export function resolveUpstreamBillerOrgId(co: {
  org_id?: string | null;
  assigned_to_org_id?: string | null;
  created_by_role?: string | null;
} | null | undefined): string | null {
  if (!co) return null;
  if (co.created_by_role === 'FC' && co.assigned_to_org_id && co.assigned_to_org_id !== co.org_id) {
    return co.assigned_to_org_id;
  }
  return co.org_id ?? null;
}
