import { crewPricingEntries } from '@/lib/crewHourReview';
import { itemLaborPricingMethod, type ItemLaborPricingFields } from '@/lib/coItemLaborPricingMethod';

export { hasCrewLaborPricing, itemLaborPricingMethod, manualItemPriceBlocksCrew } from '@/lib/coItemLaborPricingMethod';
export type { COLaborPricingMethod, ItemLaborPricingFields } from '@/lib/coItemLaborPricingMethod';

export interface MixedLaborEntryFields {
  co_line_item_id?: string | null;
  entered_by_role?: string | null;
  is_actual_cost?: boolean | null;
  line_total?: number | null;
  pricing_mode?: string | null;
  hours?: number | null;
  crew_review_status?: string | null;
}

/**
 * Labor and cost totals for mixed crew-derived and manually priced items.
 * Crew-derived rows mirror crew work and must not count that work twice;
 * manual items retain the existing TC + crew behavior.
 */
export function summarizeMixedItemLabor(
  items: readonly ItemLaborPricingFields[],
  entries: readonly MixedLaborEntryFields[],
  orderUseCrewPricing = false,
) {
  let laborTotal = 0;
  let actualCostTotal = 0;
  let billableLaborActuals = 0;
  let approvedCrewHours = 0;
  let approvedCrewLumpSum = 0;
  let hasCrewItems = false;
  let hasManualItems = false;

  for (const item of items) {
    const rows = entries.filter(entry => entry.co_line_item_id === item.id);
    const billable = rows.filter(entry => !entry.is_actual_cost);
    const actual = rows.filter(entry => entry.is_actual_cost);
    const tcBillable = billable
      .filter(entry => entry.entered_by_role === 'TC')
      .reduce((sum, entry) => sum + Number(entry.line_total ?? 0), 0);
    const fcRows = billable.filter(entry => entry.entered_by_role === 'FC');
    const fcBillable = fcRows.reduce((sum, entry) => sum + Number(entry.line_total ?? 0), 0);
    const tcActual = actual
      .filter(entry => entry.entered_by_role === 'TC')
      .reduce((sum, entry) => sum + Number(entry.line_total ?? 0), 0);
    const fcActual = actual
      .filter(entry => entry.entered_by_role === 'FC')
      .reduce((sum, entry) => sum + Number(entry.line_total ?? 0), 0);
    const eligibleCrew = crewPricingEntries(fcRows);
    const approvedCrewBillable = eligibleCrew.reduce((sum, entry) => sum + Number(entry.line_total ?? 0), 0);

    if (itemLaborPricingMethod(item, orderUseCrewPricing) === 'crew') {
      hasCrewItems = true;
      const itemLabor = tcBillable > 0 ? tcBillable : approvedCrewBillable;
      laborTotal += itemLabor;
      billableLaborActuals += itemLabor;
      actualCostTotal += tcActual > 0 ? tcActual : fcActual;
      approvedCrewHours += eligibleCrew
        .filter(entry => entry.pricing_mode === 'hourly')
        .reduce((sum, entry) => sum + Number(entry.hours ?? 0), 0);
      approvedCrewLumpSum += eligibleCrew
        .filter(entry => entry.pricing_mode === 'lump_sum')
        .reduce((sum, entry) => sum + Number(entry.line_total ?? 0), 0);
    } else {
      hasManualItems = true;
      laborTotal += tcBillable + fcBillable;
      billableLaborActuals += tcBillable;
      actualCostTotal += tcActual + fcActual;
    }
  }

  return {
    laborTotal,
    actualCostTotal,
    billableLaborActuals,
    approvedCrewHours,
    approvedCrewLumpSum,
    hasCrewItems,
    hasManualItems,
  };
}
