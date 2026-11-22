import { describe, expect, it } from 'vitest';
import { hasCrewLaborPricing, itemLaborPricingMethod, summarizeMixedItemLabor } from '@/lib/coItemLaborPricing';

const item = (id: string, labor_pricing_method: 'crew' | 'manual' | null = null) => ({ id, labor_pricing_method });
const labor = (
  id: string,
  co_line_item_id: string,
  entered_by_role: 'TC' | 'FC',
  line_total: number,
  is_actual_cost = false,
  crew_review_status: 'approved' | 'pending' | null = null,
) => ({
  id, co_line_item_id, entered_by_role, line_total, is_actual_cost, crew_review_status,
  pricing_mode: 'hourly', hours: 8,
});

describe('per-item labor pricing method', () => {
  it('inherits the existing order default only while the item choice is unset', () => {
    expect(itemLaborPricingMethod(item('one'), true)).toBe('crew');
    expect(itemLaborPricingMethod(item('one'), false)).toBe('manual');
    expect(itemLaborPricingMethod(item('one', 'manual'), true)).toBe('manual');
    expect(itemLaborPricingMethod(item('one', 'crew'), false)).toBe('crew');
  });

  it('detects a crew-priced item even when the order default is manual', () => {
    expect(hasCrewLaborPricing([item('one', 'manual'), item('two', 'crew')], false)).toBe(true);
    expect(hasCrewLaborPricing([item('one', 'manual')], true)).toBe(false);
  });

  it('calculates an $840 mixed total without double-counting crew-derived work', () => {
    const result = summarizeMixedItemLabor([
      item('crew-item', 'crew'),
      item('manual-item', 'manual'),
    ], [
      labor('crew-source', 'crew-item', 'FC', 200, false, 'approved'),
      labor('crew-price', 'crew-item', 'TC', 440),
      labor('crew-cost', 'crew-item', 'TC', 200, true),
      labor('manual-crew', 'manual-item', 'FC', 100),
      labor('manual-price', 'manual-item', 'TC', 300),
      labor('manual-cost', 'manual-item', 'TC', 50, true),
    ], false);

    expect(result.laborTotal).toBe(840);
    expect(result.billableLaborActuals).toBe(740);
    expect(result.actualCostTotal).toBe(250);
    expect(result.approvedCrewHours).toBe(8);
    expect(result.hasCrewItems).toBe(true);
    expect(result.hasManualItems).toBe(true);
  });

  it('uses only approved crew hours for a provisional crew-derived item', () => {
    const result = summarizeMixedItemLabor([item('crew-item', 'crew')], [
      labor('approved', 'crew-item', 'FC', 200, false, 'approved'),
      { ...labor('pending', 'crew-item', 'FC', 100, false, 'pending'), hours: 4 },
    ], false);

    expect(result.laborTotal).toBe(200);
    expect(result.approvedCrewHours).toBe(8);
  });
});
