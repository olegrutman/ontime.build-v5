import { describe, it, expect } from 'vitest';
import { canRemoveLaborEntry } from '@/lib/laborEntryDelete';

const base = {
  entryRole: 'TC',
  entryOrgId: 'org-tc',
  isActualCost: false,
  myRole: 'TC',
  myOrgId: 'org-tc',
  canEditExternal: true,
  canEditInternal: true,
};

describe('canRemoveLaborEntry', () => {
  it('allows the entering org to remove its billable line while pricing is open', () => {
    expect(canRemoveLaborEntry(base)).toBe(true);
  });

  it('blocks removal once the billable edit window is closed (submitted/approved)', () => {
    expect(canRemoveLaborEntry({ ...base, canEditExternal: false })).toBe(false);
  });

  it('allows internal cost removal while the internal window is open', () => {
    expect(canRemoveLaborEntry({ ...base, isActualCost: true, canEditExternal: false })).toBe(true);
  });

  it('blocks internal cost removal once finalized', () => {
    expect(canRemoveLaborEntry({ ...base, isActualCost: true, canEditInternal: false })).toBe(false);
  });

  it("blocks removing another org's line", () => {
    expect(canRemoveLaborEntry({ ...base, entryOrgId: 'org-fc' })).toBe(false);
  });

  it("blocks removing another role's line in the same org", () => {
    expect(canRemoveLaborEntry({ ...base, entryRole: 'FC' })).toBe(false);
  });

  it('blocks viewers with no role (GC looking at TC pricing)', () => {
    expect(canRemoveLaborEntry({ ...base, myRole: null })).toBe(false);
  });
});

describe('canRemoveLaborEntry — unbilled T&M entries', () => {
  it('lets the owner delete an unbilled T&M billing entry after approval', () => {
    expect(canRemoveLaborEntry({ ...base, canEditExternal: false, pricingType: 'tm' })).toBe(true);
  });
  it('lets the owner delete an unbilled NTE billing entry after approval', () => {
    expect(canRemoveLaborEntry({ ...base, canEditExternal: false, pricingType: 'nte' })).toBe(true);
  });
  it('keeps fixed-price entries locked after approval', () => {
    expect(canRemoveLaborEntry({ ...base, canEditExternal: false, pricingType: 'fixed' })).toBe(false);
  });
  it('never allows deleting a billed entry', () => {
    expect(canRemoveLaborEntry({ ...base, pricingType: 'tm', billed: true })).toBe(false);
  });
  it('still blocks another company deleting an unbilled T&M entry', () => {
    expect(canRemoveLaborEntry({ ...base, pricingType: 'tm', entryOrgId: 'org-fc' })).toBe(false);
  });
});
