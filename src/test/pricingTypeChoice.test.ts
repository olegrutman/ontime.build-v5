import { describe, it, expect } from 'vitest';
import { pricingTypeChangeMode } from '@/lib/pricingTypeChoice';

describe('pricing type change rules', () => {
  it('an order not yet submitted changes without the other company', () => {
    expect(pricingTypeChangeMode({ status: 'draft' }, false)).toBe('direct');
    expect(pricingTypeChangeMode({ status: 'work_in_progress' }, false)).toBe('direct');
  });
  it('a submitted order needs the other company to approve', () => {
    expect(pricingTypeChangeMode({ status: 'submitted' }, false)).toBe('approval');
    expect(pricingTypeChangeMode({ status: 'approved' }, false)).toBe('approval');
  });
  it('an invoiced or closed-out order cannot change type', () => {
    expect(pricingTypeChangeMode({ status: 'approved' }, true)).toBe('blocked');
    expect(pricingTypeChangeMode({ status: 'approved', completed_at: '2026-11-25' }, false)).toBe('blocked');
  });
});
