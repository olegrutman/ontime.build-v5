import { describe, expect, it } from 'vitest';
import { crewHandoffMessage, resolveCrewHandoff } from '@/lib/crewHandoffStatus';

describe('crew pricing handoff', () => {
  it('saved prices without a submission are not submitted', () => {
    const s = resolveCrewHandoff({ collaboratorStatus: 'active', crewCreatedOrder: false, crewPricedTotal: 13000 });
    expect(s).toBe('saved');
    expect(crewHandoffMessage(s, 'hirer', { crew: 'Pacifico Builders', hirer: 'IMIS, LLC' }, 13000).label)
      .toBe('Pricing saved ($13,000.00), not submitted to IMIS, LLC yet');
  });
  it('a recorded submission is submitted', () => {
    expect(resolveCrewHandoff({ collaboratorStatus: 'completed', crewCreatedOrder: false, crewPricedTotal: 0 })).toBe('submitted');
  });
  it('no prices and no submission is waiting', () => {
    expect(resolveCrewHandoff({ collaboratorStatus: 'active', crewCreatedOrder: false, crewPricedTotal: 0 })).toBe('waiting');
  });
});
