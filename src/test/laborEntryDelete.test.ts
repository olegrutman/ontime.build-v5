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
