import { describe, expect, it } from 'vitest';
import { canSendCrewPricing } from './crewPricingSend';

describe('crew pricing handoff', () => {
  it('lets Pacifico send unsent pricing even after upstream approval', () => {
    expect(canSendCrewPricing(true, 'active', 'approved')).toBe(true);
    expect(canSendCrewPricing(true, 'active', 'closed_for_pricing')).toBe(true);
  });
  it('does not resend a completed handoff', () => {
    expect(canSendCrewPricing(true, 'completed', 'approved')).toBe(false);
  });
  it('does not let the hiring company send the crew handoff', () => {
    expect(canSendCrewPricing(false, 'active', 'approved')).toBe(false);
  });
  it('does not send withdrawn work', () => {
    expect(canSendCrewPricing(true, 'active', 'withdrawn')).toBe(false);
  });
});