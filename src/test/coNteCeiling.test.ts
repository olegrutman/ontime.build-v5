import { describe, expect, it } from 'vitest';
import { nteCeilingError, parseNteCeiling } from '@/lib/coNteCeiling';

describe('order-level Not-to-exceed ceiling', () => {
  it('requires a positive ceiling for NTE only', () => {
    expect(nteCeilingError('nte', null)).toMatch('greater than zero');
    expect(nteCeilingError('nte', 0)).toMatch('greater than zero');
    expect(nteCeilingError('tm', null)).toBeNull();
    expect(nteCeilingError('fixed', null)).toBeNull();
  });

  it('accepts a ceiling that covers current actuals', () => {
    expect(nteCeilingError('nte', 1045, 1045)).toBeNull();
    expect(nteCeilingError('nte', 1200, 1045)).toBeNull();
  });

  it('rejects a ceiling below current actuals', () => {
    expect(nteCeilingError('nte', 1000, 1045)).toContain('$1045.00');
  });

  it('does not turn an empty input into a zero ceiling', () => {
    expect(parseNteCeiling('')).toBeNull();
    expect(parseNteCeiling('1200.50')).toBe(1200.5);
  });
});
