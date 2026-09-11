import { describe, it, expect } from 'vitest';
import { computeFcPricingBase, resolveUpstreamBillerOrgId } from '@/lib/fcPricingBase';

const IMIS = 'imis-org';
const PACIFICO = 'pacifico-org';
const GC = 'gc-org';

describe('computeFcPricingBase', () => {
  it('prices a fixed-price WO from crew hours × the sub rate', () => {
    const r = computeFcPricingBase({
      fcTotalHours: 8,
      fcLumpSumTotal: 0,
      hourlyRate: 65,
      markupPercent: 0,
      pricingType: 'fixed',
    });
    expect(r.isHourly).toBe(true);
    expect(r.fcHasSubmitted).toBe(true);
    expect(r.calculatedPrice).toBe(520);
  });

  it('falls back to lump sum plus markup when no hours were submitted', () => {
    const r = computeFcPricingBase({
      fcTotalHours: 0,
      fcLumpSumTotal: 1000,
      hourlyRate: 65,
      markupPercent: 15,
      pricingType: 'fixed',
    });
    expect(r.isHourly).toBe(false);
    expect(r.calculatedPrice).toBe(1150);
  });

  it('reports nothing submitted when the crew has entered no work', () => {
    const r = computeFcPricingBase({
      fcTotalHours: 0,
      fcLumpSumTotal: 0,
      hourlyRate: 65,
      markupPercent: 15,
      pricingType: 'tm',
    });
    expect(r.fcHasSubmitted).toBe(false);
    expect(r.calculatedPrice).toBe(0);
  });
});

describe('resolveUpstreamBillerOrgId', () => {
  it('gives the assigned sub the upstream billing seat on a crew-created WO', () => {
    expect(
      resolveUpstreamBillerOrgId({ org_id: PACIFICO, assigned_to_org_id: IMIS, created_by_role: 'FC' }),
    ).toBe(IMIS);
  });

  it('keeps the owner as biller for a sub-created CO', () => {
    expect(
      resolveUpstreamBillerOrgId({ org_id: IMIS, assigned_to_org_id: GC, created_by_role: 'TC' }),
    ).toBe(IMIS);
  });

  it('keeps the owner as biller for a GC-created CO', () => {
    expect(
      resolveUpstreamBillerOrgId({ org_id: GC, assigned_to_org_id: IMIS, created_by_role: 'GC' }),
    ).toBe(GC);
  });

  it('falls back to the owner when a crew-created WO has no routing target', () => {
    expect(
      resolveUpstreamBillerOrgId({ org_id: PACIFICO, assigned_to_org_id: null, created_by_role: 'FC' }),
    ).toBe(PACIFICO);
  });

  it('handles a missing change order', () => {
    expect(resolveUpstreamBillerOrgId(null)).toBeNull();
  });
});
