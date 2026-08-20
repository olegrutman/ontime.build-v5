import { describe, it, expect } from 'vitest';
import { buildProjectLedger, findCostContracts, findRevenueContract, type LedgerInput } from '@/lib/kpiLedger';

const TC = 'tc-org';
const GC = 'gc-org';
const FC = 'fc-org';

const contracts = [
  // Owner → GC
  { id: 'owner', from_role: 'Owner', to_role: 'General Contractor', from_org_id: null, to_org_id: GC, contract_sum: 0, co_approved_sum: 0 },
  // TC bills GC: revised 800000 includes 11287.25 of approved COs
  { id: 'tcgc', from_role: 'Trade Contractor', to_role: 'General Contractor', from_org_id: TC, to_org_id: GC, contract_sum: 800000, co_approved_sum: 11287.25 },
  // FC bills TC
  { id: 'fctc', from_role: 'Field Crew', to_role: 'Trade Contractor', from_org_id: FC, to_org_id: TC, contract_sum: 600000, co_approved_sum: 0 },
];

const baseInput = (over: Partial<LedgerInput>): LedgerInput => ({
  role: 'Trade Contractor',
  myOrgIds: [TC],
  contracts,
  ownerContractValue: 1_400_000,
  approvedCORevenue: 0,
  approvedCOCost: 0,
  pendingCORevenue: 0,
  pendingCOCost: 0,
  materialCommitment: 0,
  materialsAreMine: false,
  billed: 0,
  collected: 0,
  retainageHeld: 0,
  receivablesPendingAmount: 0,
  receivablesPendingCount: 0,
  payablesApproved: 0,
  payablesPaid: 0,
  payablesPendingAmount: 0,
  payablesPendingCount: 0,
  ...over,
});

describe('contract resolution', () => {
  it('picks the contract where the viewer is the billing party', () => {
    expect(findRevenueContract(contracts, [TC])?.id).toBe('tcgc');
    expect(findRevenueContract(contracts, [FC])?.id).toBe('fctc');
  });

  it('treats contracts billed TO the viewer as cost, and ignores the owner row', () => {
    expect(findCostContracts(contracts, [TC]).map((c) => c.id)).toEqual(['fctc']);
    expect(findCostContracts(contracts, [GC]).map((c) => c.id)).toEqual(['tcgc']);
  });
});

describe('revenue', () => {
  it('strips approved COs out of contract_sum to get the base', () => {
    const l = buildProjectLedger(baseInput({}));
    expect(l.baseContract.value).toBeCloseTo(788_712.75, 2);
  });

  it('revised = base + approved COs, pending excluded', () => {
    const l = buildProjectLedger(baseInput({ approvedCORevenue: 17_900, pendingCORevenue: 5_000 }));
    expect(l.revisedContract.value).toBeCloseTo(806_612.75, 2);
    expect(l.pendingCOAdds.value).toBe(5_000);
  });

  it('GC revenue is the owner contract, never the TC contract', () => {
    const l = buildProjectLedger(baseInput({ role: 'General Contractor', myOrgIds: [GC] }));
    expect(l.baseContract.value).toBe(1_400_000);
    expect(l.baseCost.value).toBeCloseTo(788_712.75, 2);
  });

  it('marks revenue unknown when there is no contract', () => {
    const l = buildProjectLedger(baseInput({ myOrgIds: ['nobody'], role: 'Field Crew' }));
    expect(l.baseContract.known).toBe(false);
  });
});

describe('cost and margin', () => {
  it('excludes materials when the viewer is not responsible', () => {
    const l = buildProjectLedger(baseInput({ materialCommitment: 357_401, materialsAreMine: false }));
    expect(l.materialCommitment.value).toBe(0);
    expect(l.revisedCost.value).toBe(600_000);
  });

  it('includes materials when the viewer is responsible', () => {
    const l = buildProjectLedger(baseInput({ materialCommitment: 100_000, materialsAreMine: true }));
    expect(l.revisedCost.value).toBe(700_000);
  });

  it('forecast margin = revised revenue − revised cost', () => {
    const l = buildProjectLedger(baseInput({ approvedCORevenue: 11_287.25, approvedCOCost: 8_000 }));
    expect(l.forecastMargin.value).toBeCloseTo(800_000 - 608_000, 2);
    expect(l.forecastMarginPct).toBeCloseTo((192_000 / 800_000) * 100, 4);
  });

  it('CO net margin only counts approved COs', () => {
    const l = buildProjectLedger(baseInput({
      approvedCORevenue: 10_000, approvedCOCost: 6_000,
      pendingCORevenue: 4_000, pendingCOCost: 5_000,
    }));
    expect(l.coNetMargin.value).toBe(4_000);
    expect(l.pendingCONetAtRisk.value).toBe(-1_000);
  });
});

describe('billing and margin to date', () => {
  it('% complete uses pre-tax billed over revised contract and caps at 100', () => {
    const l = buildProjectLedger(baseInput({ billed: 400_000 }));
    expect(l.percentComplete).toBeCloseTo((400_000 / 788_712.75) * 100, 4);
    const full = buildProjectLedger(baseInput({ billed: 2_000_000 }));
    expect(full.percentComplete).toBe(100);
  });

  it('margin to date is earned-basis, not cash', () => {
    const l = buildProjectLedger(baseInput({ billed: 394_356.375, collected: 100_000 }));
    expect(l.percentComplete).toBeCloseTo(50, 4);
    expect(l.earnedRevenue.value).toBeCloseTo(394_356.375, 2);
    expect(l.earnedCost.value).toBeCloseTo(300_000, 2);
    expect(l.marginToDate.value).toBeCloseTo(94_356.375, 2);
  });

  it('is not meaningful with zero cost — never reports 100% margin', () => {
    const l = buildProjectLedger(baseInput({ myOrgIds: [TC], contracts: [contracts[1]], billed: 50_000, collected: 50_000 }));
    expect(l.revisedCost.value).toBe(0);
    expect(l.marginToDateMeaningful).toBe(false);
  });

  it('left to bill = revised contract − billed', () => {
    const l = buildProjectLedger(baseInput({ approvedCORevenue: 11_287.25, billed: 200_000 }));
    expect(l.outstanding.value).toBeCloseTo(600_000, 2);
  });
});

describe('duplicate contract rows (re-invites)', () => {
  const dupes = [
    ...contracts,
    // Same TC → GC pair re-invited: a second row for the same counterparties.
    { id: 'tcgc-dupe', from_role: 'Trade Contractor', to_role: 'General Contractor', from_org_id: TC, to_org_id: GC, contract_sum: 800000, co_approved_sum: 0, original_contract_sum: 800000, status: 'Invited' },
  ];

  it('counts a re-invited contract once in GC subcontract cost', () => {
    const cost = findCostContracts(dupes, [GC]);
    expect(cost).toHaveLength(1);
    const ledger = buildProjectLedger(baseInput({ role: 'General Contractor', myOrgIds: [GC], contracts: dupes }));
    expect(ledger.baseCost.value).toBeCloseTo(800000 - 11287.25, 2);
  });

  it('prefers the active row over a stale invite as the revenue contract', () => {
    const active = { ...contracts[1], status: 'Active' };
    const stale = { ...dupes[3], contract_sum: 900000, original_contract_sum: 900000 };
    expect(findRevenueContract([stale, active], [TC])?.id).toBe('tcgc');
  });
});
