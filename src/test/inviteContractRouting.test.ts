import { describe, expect, it } from 'vitest';
import { downstreamPayerType } from '@/lib/inviteContractRouting';

describe('downstream invitation contract routing', () => {
  it('routes a GC-invited crew to the subcontractor', () => {
    expect(downstreamPayerType('GC', 'Crew')).toBe('TC');
  });

  it('keeps a subcontractor-invited crew with that subcontractor', () => {
    expect(downstreamPayerType('TC', 'Crew')).toBe('TC');
  });

  it('keeps a GC-invited subcontractor with the GC', () => {
    expect(downstreamPayerType('GC', 'Subcontractor')).toBe('GC');
  });
});
