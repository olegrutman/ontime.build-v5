import { describe, it, expect } from 'vitest';
import { coLabel, coAbbrev, docTypeFromMode } from '@/lib/coLabel';

describe('coLabel', () => {
  it('returns "Change Order" for CO', () => {
    expect(coLabel('CO')).toBe('Change Order');
  });

  it('returns "Work Order" for WO', () => {
    expect(coLabel('WO')).toBe('Work Order');
  });

  it('returns plural forms', () => {
    expect(coLabel('CO', true)).toBe('Change Orders');
    expect(coLabel('WO', true)).toBe('Work Orders');
  });
});

describe('coAbbrev', () => {
  it('returns abbreviated forms', () => {
    expect(coAbbrev('CO')).toBe('CO');
    expect(coAbbrev('WO')).toBe('WO');
  });

  it('returns plural abbreviated forms', () => {
    expect(coAbbrev('CO', true)).toBe('COs');
    expect(coAbbrev('WO', true)).toBe('WOs');
  });
});

describe('docTypeFromMode', () => {
  it('returns WO for T&M mode', () => {
    expect(docTypeFromMode(true)).toBe('WO');
  });

  it('returns CO for fixed mode', () => {
    expect(docTypeFromMode(false)).toBe('CO');
  });
});
