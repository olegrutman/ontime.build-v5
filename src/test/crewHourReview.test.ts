import { describe, expect, it } from 'vitest';
import { canUseCrewEntryForPricing, crewPricingEntries, crewReviewDecisionError } from '@/lib/crewHourReview';

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
