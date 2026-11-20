import { describe, expect, it } from 'vitest';
import { canBillCrewLaborEntry, canCrewBillOrder, canUseCrewEntryForPricing, crewPricingEntries, crewReviewDecisionError } from '@/lib/crewHourReview';

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
