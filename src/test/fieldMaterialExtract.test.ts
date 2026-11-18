import { describe, it, expect } from 'vitest';
import { extractMaterial, catalogDimension, catalogLengthFt } from '@/lib/fieldMaterialExtract';

describe('extractMaterial', () => {
  it('drops filler words and keeps 2x8, 16 ft and 24 pieces', () => {
    const m = extractMaterial('Supply 24 pieces of 2x8 at 16 ft.');
    expect(m).toMatchObject({ nominal: '2x8', lengthFt: 16, quantity: 24 });
    expect(m.keywords).toEqual([]);
    expect(catalogDimension(m)).toBe('2 in. x 8 in.');
  });
  it('reads 2x8x16 shorthand', () => {
    expect(extractMaterial('need 10 2x8x16')).toMatchObject({ nominal: '2x8', lengthFt: 16, quantity: 10 });
  });
  it('never invents a missing length or quantity', () => {
    expect(extractMaterial('we need 2x8 doug fir')).toMatchObject({ nominal: '2x8', lengthFt: null, quantity: null });
  });
  it('parses catalog lengths', () => {
    expect(catalogLengthFt('16 ft.')).toBe(16);
    expect(catalogLengthFt('104-5/8 in.')).toBeNull();
  });
});
