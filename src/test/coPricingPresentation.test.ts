import { describe, expect, it } from 'vitest';
import { getNteEntryStatus, getNteUsedAmount, unbilledActuals } from '@/lib/coPricingPresentation';

describe('pricing-mode calculations', () => {
  it('counts labor, materials and equipment once against the NTE ceiling', () => {
    expect(getNteUsedAmount(1200, 300.25, 99.75)).toBe(1600);
  });

  it('blocks a new entry that would exceed the $3,500 ceiling', () => {
    const result = getNteEntryStatus(3470, 40, 3500);
    expect(result.projectedUsed).toBe(3510);
    expect(result.remainingBeforeEntry).toBe(30);
    expect(result.exceedsCap).toBe(true);
  });

  it('allows an entry that lands exactly on the ceiling', () => {
    const result = getNteEntryStatus(3470, 30, 3500);
    expect(result.percentUsed).toBe(100);
    expect(result.exceedsCap).toBe(false);
  });

  it('credits the old amount when editing an existing entry', () => {
    const result = getNteEntryStatus(3400, 200, 3500, 100);
    expect(result.projectedUsed).toBe(3500);
    expect(result.exceedsCap).toBe(false);
  });

  it('keeps draft invoices separate from billed and available actuals', () => {
    expect(unbilledActuals(2000, 800, 300)).toBe(900);
  });
});
