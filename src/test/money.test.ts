import { describe, it, expect } from 'vitest';
import { parseMoney, parsePercent, toCents } from '@/lib/money';

describe('parseMoney', () => {
  it('keeps cents (regression: $8M bug)', () => {
    expect(parseMoney('813,367.50')).toBe(813367.5);
    expect(parseMoney('$813,367.50')).toBe(813367.5);
    expect(parseMoney('800000')).toBe(800000);
  });
  it('handles negatives and parens', () => {
    expect(parseMoney('-1,200.25')).toBe(-1200.25);
    expect(parseMoney('($1,200.25)')).toBe(-1200.25);
  });
  it('handles empty / bad input', () => {
    expect(parseMoney('')).toBe(0);
    expect(parseMoney(null)).toBe(0);
    expect(parseMoney('abc')).toBe(0);
    expect(parseMoney(NaN)).toBe(0);
  });
  it('passes numbers through', () => {
    expect(parseMoney(1234.56)).toBe(1234.56);
  });
});

describe('parsePercent', () => {
  it('strips the percent sign', () => {
    expect(parsePercent('12.5%')).toBe(12.5);
  });
});

describe('toCents', () => {
  it('rounds float drift', () => {
    expect(toCents(0.1 + 0.2)).toBe(0.3);
  });
});
