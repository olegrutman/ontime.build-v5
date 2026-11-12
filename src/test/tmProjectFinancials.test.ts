import { describe, expect, it } from 'vitest';
import { addApprovedWorkOrderCosts } from '@/lib/tmProjectFinancials';

describe('T&M/remodel project costs', () => {
  it('adds approved work-order costs when another commitment already exists', () => {
    expect(addApprovedWorkOrderCosts(2000, 1000)).toBe(3000);
  });

  it('adds approved work-order costs to material and crew commitments without replacing them', () => {
    expect(addApprovedWorkOrderCosts(500 + 800, 1000)).toBe(2300);
  });
});
