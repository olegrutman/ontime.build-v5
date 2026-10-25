import { describe, expect, it } from 'vitest';
import { getCOPricingReadiness, coPricingStatusLabel } from '@/lib/coPricingReadiness';

const items = [{ id: 'scope-1' }, { id: 'scope-2' }];
const entry = (id: string, role = 'TC', cost = false, total = 3120) => ({
  co_line_item_id: id, entered_by_role: role, is_actual_cost: cost, line_total: total,
});

describe('CO pricing readiness', () => {
  it('is ready only when every scope item has its billing price', () => {
    expect(getCOPricingReadiness(items, [entry('scope-1'), entry('scope-2')], 'TC')).toBe('ready');
    expect(getCOPricingReadiness(items, [entry('scope-1')], 'TC')).toBe('incomplete');
  });
  it('does not confuse crew pricing or private cost with subcontractor pricing', () => {
    expect(getCOPricingReadiness(items, [entry('scope-1', 'FC'), entry('scope-2', 'TC', true)], 'TC')).toBe('unpriced');
    expect(getCOPricingReadiness([{ id: 'scope-1' }], [entry('scope-1', 'FC')], 'FC')).toBe('ready');
  });
  it('requires prices for existing procurement rows too', () => {
    expect(getCOPricingReadiness(items, items.map(i => entry(i.id)), 'TC', [{ billed_amount: 0 }])).toBe('incomplete');
  });
  it('does not mark empty scope or zero-value entries as ready', () => {
    expect(getCOPricingReadiness([], [], 'TC')).toBe('unpriced');
    expect(getCOPricingReadiness(items, items.map(i => entry(i.id, 'TC', false, 0)), 'TC')).toBe('unpriced');
  });
  it('keeps readiness separate from submitted, approved and internal approval states', () => {
    for (const status of ['submitted', 'approved', 'contracted', 'rejected', 'withdrawn'] as const) {
      expect(coPricingStatusLabel(status, 'ready')).toBeUndefined();
    }
    expect(coPricingStatusLabel('draft', 'ready', true)).toBeUndefined();
  });
});