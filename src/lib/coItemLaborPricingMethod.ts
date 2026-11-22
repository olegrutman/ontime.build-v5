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
