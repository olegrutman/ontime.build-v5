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
