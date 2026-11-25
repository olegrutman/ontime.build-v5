import { describe, it, expect } from 'vitest';
import { tmOrderPhase, canAddTMTicket } from '@/lib/tmLifecycle';

describe('continuous T&M lifecycle', () => {
  it('approved T&M order stays open collecting time', () => {
    expect(tmOrderPhase({ pricing_type: 'tm', status: 'approved', completed_at: null })).toBe('collecting');
  });
  it('closed-out T&M order accepts no new tickets', () => {
    const co = { pricing_type: 'tm', status: 'approved', completed_at: '2026-11-25T00:00:00Z' };
    expect(tmOrderPhase(co)).toBe('closed');
    expect(canAddTMTicket(co)).toBe(false);
  });
  it('NTE follows the same continuous flow', () => {
    expect(tmOrderPhase({ pricing_type: 'nte', status: 'contracted' })).toBe('collecting');
  });
  it('fixed price is not part of the T&M lifecycle', () => {
    expect(tmOrderPhase({ pricing_type: 'fixed', status: 'approved' })).toBe('not_tm');
  });
});
