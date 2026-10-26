import { describe, expect, it } from 'vitest';
import { canDecidePriceRevision, canSubmitPriceRevision, revisionPriceChange } from '@/lib/coPriceRevision';

describe('corrected-price approval', () => {
  it('adds only the difference from $3,120 to $4,120', () => {
    expect(revisionPriceChange(3120, 4120)).toBe(1000);
  });
  it('allows the submitting company to revise an approved order', () => {
    expect(canSubmitPriceRevision('approved', 'imis', 'imis', true)).toBe(true);
    expect(canSubmitPriceRevision('draft', 'imis', 'imis', true)).toBe(false);
    expect(canSubmitPriceRevision('approved', 'imis', 'other', true)).toBe(false);
  });
  it('only lets the recipient decide pending revisions', () => {
    expect(canDecidePriceRevision('pending', 'haley', 'haley', true)).toBe(true);
    expect(canDecidePriceRevision('pending', 'haley', 'imis', true)).toBe(false);
    expect(canDecidePriceRevision('approved', 'haley', 'haley', true)).toBe(false);
    expect(canDecidePriceRevision('pending', 'haley', 'haley', false)).toBe(false);
  });
});