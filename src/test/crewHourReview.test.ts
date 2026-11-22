import { describe, expect, it } from 'vitest';
import { canBillCrewLaborEntry, canCrewBillOrder, canUseCrewEntryForPricing, crewPricingEntries, crewReviewDecisionError, crewUpstreamPricingError } from '@/lib/crewHourReview';

const crewEntry = (crew_review_status: 'pending' | 'approved' | 'rejected' | null) => ({
  id: crew_review_status ?? 'legacy',
  entered_by_role: 'FC',
  is_actual_cost: false,
  crew_review_status,
  hours: 8,
});

describe('crew-hour approval pricing gate', () => {
  it('excludes pending crew hours from new crew-derived pricing', () => {
    expect(canUseCrewEntryForPricing(crewEntry('pending'))).toBe(false);
  });

  it('includes approved crew hours', () => {
    expect(canUseCrewEntryForPricing(crewEntry('approved'))).toBe(true);
  });

  it('excludes rejected crew hours', () => {
    expect(canUseCrewEntryForPricing(crewEntry('rejected'))).toBe(false);
  });

  it('preserves historical unreviewed entries exactly as they were', () => {
    expect(canUseCrewEntryForPricing(crewEntry(null))).toBe(true);
  });

  it('uses only the approved 8 hours when pending and rejected entries coexist', () => {
    const eligible = crewPricingEntries([crewEntry('pending'), crewEntry('approved'), crewEntry('rejected')]);
    expect(eligible.map(entry => entry.id)).toEqual(['approved']);
    expect(eligible.reduce((sum, entry) => sum + entry.hours, 0)).toBe(8);
  });

  it('never treats a private actual-cost row as a crew billing entry', () => {
    expect(canUseCrewEntryForPricing({ ...crewEntry('approved'), is_actual_cost: true })).toBe(false);
  });
});

describe('crew-hour rejection reason', () => {
  it('requires a concrete reason when hours are rejected', () => {
    expect(crewReviewDecisionError('rejected', '   ')).toBe('Explain why these crew hours are rejected.');
  });

  it('accepts a rejection with an explanation', () => {
    expect(crewReviewDecisionError('rejected', 'Only 6 hours were worked.')).toBeNull();
  });

  it('does not require a note to approve hours', () => {
    expect(crewReviewDecisionError('approved')).toBeNull();
  });
});

describe('crew T&M billing eligibility', () => {
  it('opens a submitted T&M order when the subcontractor approved crew hours', () => {
    expect(canCrewBillOrder({ pricing_type: 'tm', status: 'submitted' }, true)).toBe(true);
  });

  it('keeps a submitted T&M order closed without approved crew hours', () => {
    expect(canCrewBillOrder({ pricing_type: 'tm', status: 'submitted' }, false)).toBe(false);
  });

  it('does not use hour approval to open fixed-price billing', () => {
    expect(canCrewBillOrder({ pricing_type: 'fixed', status: 'submitted' }, true)).toBe(false);
  });

  it('allows approved T&M hours even while the upstream order is still draft', () => {
    expect(canCrewBillOrder({ pricing_type: 'tm', status: 'draft' }, true)).toBe(true);
  });

  it('preserves existing overall-approval billing', () => {
    expect(canCrewBillOrder({ pricing_type: 'tm', status: 'approved' }, false)).toBe(true);
    expect(canCrewBillOrder({ pricing_type: 'tm', status: 'contracted' }, false)).toBe(true);
  });

  it('bills approved hours on a submitted T&M order before item completion', () => {
    expect(canBillCrewLaborEntry(crewEntry('approved'), { pricing_type: 'tm', status: 'submitted' })).toBe(true);
  });

  it('excludes pending and rejected hours from T&M invoices', () => {
    const order = { pricing_type: 'tm', status: 'submitted' };
    expect(canBillCrewLaborEntry(crewEntry('pending'), order)).toBe(false);
    expect(canBillCrewLaborEntry(crewEntry('rejected'), order)).toBe(false);
  });

  it('preserves legacy entries only after overall approval', () => {
    expect(canBillCrewLaborEntry(crewEntry(null), { pricing_type: 'tm', status: 'submitted' })).toBe(false);
    expect(canBillCrewLaborEntry(crewEntry(null), { pricing_type: 'tm', status: 'approved' })).toBe(true);
  });

  it('never converts a private actual-cost row into an invoice line', () => {
    expect(canBillCrewLaborEntry({ ...crewEntry('approved'), is_actual_cost: true }, { pricing_type: 'tm', status: 'submitted' })).toBe(false);
  });
});

describe('crew upstream pricing guard', () => {
  const items = [{ id: 'item-1' }, { id: 'item-2' }];
  const priced = (item: string, total: number) => ({
    co_line_item_id: item,
    org_id: 'subcontractor',
    entered_by_role: 'TC',
    is_actual_cost: false,
    line_total: total,
  });

  it('blocks overall-approved crew work while one hour entry is still pending', () => {
    const error = crewUpstreamPricingError(items, [
      { ...crewEntry('pending'), co_line_item_id: 'item-1' },
      priced('item-1', 440),
      priced('item-2', 300),
    ], 'subcontractor');
    expect(error).toBe('Review every crew time entry before sending this order upstream.');
  });

  it('blocks forwarding when exactly one of two scope items has no subcontractor price', () => {
    const error = crewUpstreamPricingError(items, [priced('item-1', 440)], 'subcontractor');
    expect(error).toBe('Confirm a non-zero price for the scope item before sending this order upstream.');
  });

  it('allows crew-derived forwarding after reviews when every item is priced', () => {
    const error = crewUpstreamPricingError(items, [
      { ...crewEntry('approved'), co_line_item_id: 'item-1' },
      priced('item-1', 440),
      priced('item-2', 300),
    ], 'subcontractor');
    expect(error).toBeNull();
  });

  it('keeps pending reviews separate from manually priced crew orders', () => {
    const error = crewUpstreamPricingError(items, [
      { ...crewEntry('pending'), co_line_item_id: 'item-1' },
      priced('item-1', 440),
      priced('item-2', 300),
    ], 'subcontractor', false);
    expect(error).toBeNull();
  });

  it('does not require crew-hour review for a manually priced item', () => {
    const mixedItems = [
      { id: 'item-1', labor_pricing_method: 'manual' as const },
      { id: 'item-2', labor_pricing_method: 'manual' as const },
    ];
    const error = crewUpstreamPricingError(mixedItems, [
      { ...crewEntry('pending'), co_line_item_id: 'item-1' },
      priced('item-1', 440),
      priced('item-2', 300),
    ], 'subcontractor', true);
    expect(error).toBeNull();
  });

  it('requires review when an item opts into crew hours despite a manual order default', () => {
    const mixedItems = [{ id: 'item-1', labor_pricing_method: 'crew' as const }];
    const error = crewUpstreamPricingError(mixedItems, [
      { ...crewEntry('pending'), co_line_item_id: 'item-1' },
      priced('item-1', 440),
    ], 'subcontractor', false);
    expect(error).toBe('Review every crew time entry before sending this order upstream.');
  });

  it('rejects a zero-priced scope item rather than sending $0 upstream', () => {
    const error = crewUpstreamPricingError([{ id: 'item-1' }], [priced('item-1', 0)], 'subcontractor', false);
    expect(error).toBe('Confirm a non-zero price for the scope item before sending this order upstream.');
  });

  it('rejects an empty crew order instead of treating zero items as fully priced', () => {
    expect(crewUpstreamPricingError([], [], 'subcontractor')).toBe('Add at least one scope item before sending this order upstream.');
  });
});
