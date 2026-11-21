import { describe, expect, it } from 'vitest';
import { CO_PRICING_PRESENTATION } from '@/lib/coPricingPresentation';

describe('change order pricing-type presentation', () => {
  it('uses explicit Fixed price, T&M and Not to exceed list labels', () => {
    expect(CO_PRICING_PRESENTATION.fixed.listLabel).toBe('Fixed price');
    expect(CO_PRICING_PRESENTATION.tm.listLabel).toBe('T&M');
    expect(CO_PRICING_PRESENTATION.nte.listLabel).toBe('Not to exceed');
  });
});
