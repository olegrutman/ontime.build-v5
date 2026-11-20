import { describe, expect, it } from 'vitest';
import { canApproveOwnOrderInternally, canFixReturnedCrewOrder, isOwnOrderInternallyApproved } from '@/lib/coInternalApproval';

const ownOrder = {
  status: 'draft' as const,
  created_by_role: 'TC' as const,
  org_id: 'sub-1',
  assigned_to_org_id: 'gc-1',
  kept_internal: false,
};

describe('subcontractor internal order approval', () => {
  it('allows the owning subcontractor to approve its priced order without upstream approval', () => {
    expect(canApproveOwnOrderInternally(ownOrder, true, 'sub-1')).toBe(true);
  });

  it('allows an own submitted order to be recalled and approved internally', () => {
    expect(canApproveOwnOrderInternally({ ...ownOrder, status: 'submitted' }, true, 'sub-1')).toBe(true);
  });

  it('does not allow another company or a crew to self-approve the order', () => {
    expect(canApproveOwnOrderInternally(ownOrder, true, 'other')).toBe(false);
    expect(canApproveOwnOrderInternally(ownOrder, false, 'sub-1')).toBe(false);
  });

  it('does not replace an upstream approved or contracted decision', () => {
    expect(canApproveOwnOrderInternally({ ...ownOrder, status: 'approved' }, true, 'sub-1')).toBe(false);
    expect(canApproveOwnOrderInternally({ ...ownOrder, status: 'contracted' }, true, 'sub-1')).toBe(false);
  });

  it('recognizes the editable pre-submission internal approval', () => {
    expect(isOwnOrderInternallyApproved({ ...ownOrder, kept_internal: true }, true, 'sub-1')).toBe(true);
    expect(isOwnOrderInternallyApproved({ ...ownOrder, status: 'submitted', kept_internal: true }, true, 'sub-1')).toBe(false);
  });
});

describe('returned crew-order corrections', () => {
  const returned = { ...ownOrder, created_by_role: 'FC' as const, org_id: 'crew-1', assigned_to_org_id: 'sub-1', status: 'rejected' as const };

  it('lets the originating crew fix its returned order', () => {
    expect(canFixReturnedCrewOrder(returned, { isGC: false, isTC: false, isFC: true, myOrgId: 'crew-1' })).toBe(true);
  });

  it('lets the reviewing subcontractor fix a returned order', () => {
    expect(canFixReturnedCrewOrder(returned, { isGC: false, isTC: true, isFC: false, myOrgId: 'sub-1' })).toBe(true);
  });

  it('does not open the returned order to the General Contractor or another crew', () => {
    expect(canFixReturnedCrewOrder(returned, { isGC: true, isTC: false, isFC: false, myOrgId: 'gc-1' })).toBe(false);
    expect(canFixReturnedCrewOrder(returned, { isGC: false, isTC: false, isFC: true, myOrgId: 'other' })).toBe(false);
  });

  it('does not reopen submitted or upstream-approved orders through the fix path', () => {
    for (const status of ['submitted', 'approved', 'contracted'] as const) {
      expect(canFixReturnedCrewOrder({ ...returned, status }, { isGC: false, isTC: false, isFC: true, myOrgId: 'crew-1' })).toBe(false);
    }
  });
});
