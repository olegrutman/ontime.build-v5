import { describe, it, expect } from 'vitest';
import { woBillingSummary, fixedProgressAmount, clampToRemaining } from '@/lib/woProgressBilling';

describe('WO progress billing', () => {
  it('fixed price: 60% of $25,475 bills $15,285', () => {
    expect(fixedProgressAmount(25475, 60, 0)).toBe(15285);
  });

  it('fixed price: second claim never exceeds remaining balance', () => {
    expect(fixedProgressAmount(25475, 60, 15285)).toBe(10190);
  });

  it('final true-up bills exactly the remaining balance', () => {
    const s = woBillingSummary(25475, 15285);
    expect(s.remaining).toBe(10190);
    expect(s.status).toBe('partially_billed');
  });

  it('NTE cap limits cumulative billing', () => {
    const s = woBillingSummary(12000, 9000, 10000);
    expect(s.limit).toBe(10000);
    expect(clampToRemaining(2500, s)).toBe(1000);
  });

  it('status is fully billed at the approved value', () => {
    expect(woBillingSummary(6332, 6332).status).toBe('fully_billed');
    expect(woBillingSummary(6332, 0).status).toBe('unbilled');
  });
});
