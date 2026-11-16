import { describe, it, expect } from 'vitest';
import { conversionFor } from '../fieldItemConversion';

describe('field item conversion', () => {
  it('extra work becomes a work order once reviewable', () => {
    expect(conversionFor({ kind: 'extra_work', status: 'released' })).toBe('work_order');
  });
  it('material becomes a material order', () => {
    expect(conversionFor({ kind: 'material', status: 'crew_confirmed' })).toBe('material_order');
  });
  it('drafts and already converted items cannot convert', () => {
    expect(conversionFor({ kind: 'material', status: 'draft' })).toBeNull();
    expect(conversionFor({ kind: 'extra_work', status: 'converted' })).toBeNull();
  });
  it('progress, blockers and hours never convert', () => {
    expect(conversionFor({ kind: 'progress', status: 'released' })).toBeNull();
    expect(conversionFor({ kind: 'hours', status: 'released' })).toBeNull();
  });
});
