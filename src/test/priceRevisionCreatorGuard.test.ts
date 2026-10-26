import { describe, expect, it } from 'vitest';
import { canDecidePriceRevision, revisionPriceChange } from '@/lib/coPriceRevision';
import { canEditInfoContract, isInfoCreator } from '@/lib/projectInfoAccess';

describe('contractor revision approval is separate from creator editing', () => {
  it('allows Haley to decide the pending $3,120 to $4,120 revision without gaining direct-edit rights', () => {
    expect(canDecidePriceRevision('pending', 'haley', 'haley', true)).toBe(true);
    expect(revisionPriceChange(3120, 4120)).toBe(1000);
    expect(isInfoCreator('imis-user', 'haley-user')).toBe(false);
    expect(canEditInfoContract({
      id: 'imis-haley-contract', from_org_id: 'imis', to_org_id: 'haley',
      from_role: 'Subcontractor', to_role: 'General Contractor',
      contract_sum: 183150, created_by_user_id: 'imis-user', status: 'Accepted',
    }, 'haley-user')).toBe(false);
  });
});