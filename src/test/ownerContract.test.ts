import { describe, expect, it } from 'vitest';
import {
  findOwnerContractRow,
  ownerPriceOf,
  resolveOwnerPrice,
  type OwnerContractLike,
} from '../lib/ownerContract';

const GC = '11111111-1111-1111-1111-111111111111';
const OTHER_GC = '22222222-2222-2222-2222-222222222222';

const ownerRow = (over: Partial<OwnerContractLike> = {}): OwnerContractLike => ({
  id: 'owner-1',
  from_role: 'Owner',
  to_role: 'General Contractor',
  contract_sum: 0,
  owner_contract_value: null,
  to_org_id: GC,
  ...over,
});

const tcRow: OwnerContractLike = {
  id: 'tc-1',
  from_role: 'Subcontractor',
  to_role: 'General Contractor',
  contract_sum: 184150,
  owner_contract_value: null,
  to_org_id: GC,
};

describe('owner price (GC revenue baseline)', () => {
  it('reads the price from the owner contract, never the subcontractor contract', () => {
    const contracts = [tcRow, ownerRow({ owner_contract_value: 412000 })];
    expect(resolveOwnerPrice(contracts, GC)).toBe(412000);
  });

  it('falls back to a positive contract sum when no explicit owner value was saved', () => {
    // The setup wizard writes contract_sum only; KPIs must still see the price.
    const contracts = [tcRow, ownerRow({ contract_sum: 250000 })];
    expect(resolveOwnerPrice(contracts, GC)).toBe(250000);
  });

  it('reports nothing known when the project has no owner contract at all', () => {
    expect(resolveOwnerPrice([tcRow], GC)).toBeNull();
    expect(resolveOwnerPrice([ownerRow({ contract_sum: 0 })], GC)).toBeNull();
  });

  it('keeps an explicit zero instead of inventing revenue from the contract sum', () => {
    const contracts = [ownerRow({ owner_contract_value: 0, contract_sum: 500000 })];
    expect(resolveOwnerPrice(contracts, GC)).toBe(0);
    expect(ownerPriceOf(contracts[0])).toBe(0);
  });

  it('uses a legacy owner value on the primary contract only when no owner row exists', () => {
    const primary: OwnerContractLike = {
      id: 'tc-1',
      from_role: 'General Contractor',
      to_role: 'Subcontractor',
      contract_sum: 120000,
      owner_contract_value: 300000,
      to_org_id: GC,
    };
    expect(resolveOwnerPrice([primary], GC, primary)).toBe(300000);
    // With a real owner row present, the legacy value must not win.
    expect(resolveOwnerPrice([primary, ownerRow({ owner_contract_value: 95000 })], GC, primary)).toBe(95000);
  });

  it('never bills off another GC company\'s prime contract', () => {
    const contracts = [ownerRow({ to_org_id: OTHER_GC, owner_contract_value: 999000 }), tcRow];
    expect(findOwnerContractRow(contracts, GC)).toBeUndefined();
    expect(resolveOwnerPrice(contracts, GC)).toBeNull();
    // An owner row with no org recorded (legacy) is still usable by the viewer's GC.
    expect(resolveOwnerPrice([ownerRow({ to_org_id: null, contract_sum: 400000 })], GC)).toBe(400000);
  });
});

import { resolveOwnerPrice as resolveForDashboard } from '@/lib/ownerContract';
describe('legacy owner value without explicit fallback', () => {
  it('dashboard-style call reads the owner value stored on the GC–subcontractor row', () => {
    const rows = [{ from_role: 'Subcontractor', to_role: 'General Contractor', owner_contract_value: 900000, contract_sum: 400000, to_org_id: 'gc' }];
    expect(resolveForDashboard(rows, 'gc')).toBe(900000);
  });
});
