export type COLaborPricingMethod = 'crew' | 'manual';

export interface ItemLaborPricingFields {
  id: string;
  /** NULL inherits the order's legacy default so existing orders do not change. */
  labor_pricing_method?: COLaborPricingMethod | null;
}

export function itemLaborPricingMethod(
  item: Pick<ItemLaborPricingFields, 'labor_pricing_method'>,
  orderUseCrewPricing = false,
): COLaborPricingMethod {
  return item.labor_pricing_method ?? (orderUseCrewPricing ? 'crew' : 'manual');
}

export function hasCrewLaborPricing(
  items: readonly ItemLaborPricingFields[],
  orderUseCrewPricing = false,
): boolean {
  return items.some(item => itemLaborPricingMethod(item, orderUseCrewPricing) === 'crew');
}

export interface ItemLaborMethodEntryFields {
  org_id: string;
  entered_by_role: string;
  is_actual_cost: boolean;
  crew_pricing_derived?: boolean | null;
}

/** Saved manual prices must be removed explicitly before an item can derive from crew time. */
export function manualItemPriceBlocksCrew(
  entries: readonly ItemLaborMethodEntryFields[],
  orgId: string,
): boolean {
  return entries.some(entry => entry.org_id === orgId
    && entry.entered_by_role === 'TC'
    && !entry.is_actual_cost
    && !entry.crew_pricing_derived);
}
