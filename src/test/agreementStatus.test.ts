import { describe, it, expect } from 'vitest';
import { crewItemStatus, crewPricingSent } from '@/lib/agreementStatus';

const fc = (s: string | null) => ({ entered_by_role: 'FC', is_actual_cost: false, crew_review_status: s }) as any;

describe('crew agreement status', () => {
  it('unsent fixed crew pricing is not sent, never approved', () => {
    expect(crewItemStatus([fc('pending')], false)).toBe('not_sent');
  });
  it('sent pricing waits for the hiring company', () => {
    expect(crewItemStatus([fc('pending')], true)).toBe('waiting');
  });
  it('accepted only when the hiring company accepted', () => {
    expect(crewItemStatus([fc('approved'), fc('approved')], true)).toBe('accepted');
  });
  it('a rejected entry sends the item back', () => {
    expect(crewItemStatus([fc('approved'), fc('rejected')], true)).toBe('rejected');
  });
  it('subcontractor entries do not create a crew status', () => {
    expect(crewItemStatus([{ entered_by_role: 'TC', is_actual_cost: false, crew_review_status: null } as any], true)).toBe('none');
  });
  it('fixed pricing is sent only after the crew handoff; T&M always reviewable', () => {
    expect(crewPricingSent('fixed', [{ status: 'active' }])).toBe(false);
    expect(crewPricingSent('fixed', [{ status: 'completed' }])).toBe(true);
    expect(crewPricingSent('tm', [{ status: 'active' }])).toBe(true);
  });
});

import { agreementViewFor, visibleAgreements, showCrewMarginWarning } from '@/lib/agreementStatus';

describe('role-based agreement visibility', () => {
  const base = { coOrgId: 'imis', collaborators: [{ organization_id: 'pacifico' }] };
  const gc = agreementViewFor({ ...base, isGC: true, isTC: false, isFC: false, myOrgId: 'encompass' });
  const tc = agreementViewFor({ ...base, isGC: false, isTC: true, isFC: false, myOrgId: 'imis' });
  const fc = agreementViewFor({ ...base, isGC: false, isTC: false, isFC: true, myOrgId: 'pacifico' });

  it('general contractor sees only its agreement with the subcontractor', () => {
    expect(visibleAgreements(gc)).toEqual({ upstream: true, crew: false });
  });
  it('subcontractor sees both of its agreements', () => {
    expect(visibleAgreements(tc)).toEqual({ upstream: true, crew: true });
  });
  it('crew sees only its agreement with the subcontractor', () => {
    expect(visibleAgreements(fc)).toEqual({ upstream: false, crew: true });
  });
  it('a crew that created its own order sees that order as its own agreement', () => {
    expect(agreementViewFor({ isGC: false, isTC: false, isFC: true, coOrgId: 'pacifico', myOrgId: 'pacifico', collaborators: [] })).toBe('upstream');
  });
  it('margin warning shows to the subcontractor only', () => {
    expect(showCrewMarginWarning(tc, 13000, 12600)).toBe(true);
    expect(showCrewMarginWarning(fc, 13000, 12600)).toBe(false);
    expect(showCrewMarginWarning(gc, 13000, 12600)).toBe(false);
    expect(showCrewMarginWarning(tc, 12000, 12600)).toBe(false);
  });
});
