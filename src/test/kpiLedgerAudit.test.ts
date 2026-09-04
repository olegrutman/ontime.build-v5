import { describe, it, expect } from 'vitest';
import { buildProjectLedger, type LedgerInput } from '@/lib/kpiLedger';

/**
 * Regression tests for the KPI audit of project "Main Street Apartments"
 * (66ccdaeb). Each block pins one confirmed-wrong card so the old math can't
 * come back. Live numbers used below come straight from that project.
 */

const baseInput = (over: Partial<LedgerInput> = {}): LedgerInput => ({
  role: 'Trade Contractor',
  myOrgIds: ['tc'],
  contracts: [
    { id: 'c1', from_role: 'Trade Contractor', to_role: 'General Contractor', from_org_id: 'tc', to_org_id: 'gc', contract_sum: 814540.5, original_contract_sum: 800000, co_approved_sum: 14540.5, status: 'Active' },
    { id: 'c2', from_role: 'Field Crew', to_role: 'Trade Contractor', from_org_id: 'fc', to_org_id: 'tc', contract_sum: 600000, original_contract_sum: 600000, co_approved_sum: 0, status: 'Active' },
  ],
  ownerContractValue: null,
  approvedCORevenue: 14540.5,
  approvedCOCost: 978.5,
  pendingCORevenue: 0,
  pendingCOCost: 0,
  materialCommitment: 0,
  materialsAreMine: false,
  billed: 122986.84,
  collected: 122986.84,
  retainageHeld: 0,
  receivablesPendingAmount: 0,
  receivablesPendingCount: 0,
  payablesApproved: 0,
  payablesPaid: 0,
  payablesPendingAmount: 0,
  payablesPendingCount: 0,
  actualCostToDate: 853.5,
  ...over,
});

describe('margin to date is real performance, not a slice of the forecast', () => {
  it('TC: billed minus cost actually incurred', () => {
    const l = buildProjectLedger(baseInput());
    expect(l.earnedRevenue.value).toBeCloseTo(122986.84, 2);
    expect(l.earnedCost.value).toBeCloseTo(853.5, 2);
    expect(l.marginToDate.value).toBeCloseTo(122133.34, 2);
  });

  it('never mirrors the forecast margin percentage', () => {
    const l = buildProjectLedger(baseInput());
    // Old bug: both sides scaled by % complete, so the two percentages were
    // always identical and the card could never surface a job going sideways.
    expect(Math.abs(l.marginToDatePct - l.forecastMarginPct)).toBeGreaterThan(1);
  });

  it('is unknown until some cost has actually been incurred', () => {
    const l = buildProjectLedger(baseInput({ actualCostToDate: 0 }));
    expect(l.earnedCost.known).toBe(false);
    expect(l.marginToDate.known).toBe(false);
  });
});

describe('forecast margin needs a cost side', () => {
  it('FC with revenue but no downstream cost is not 100% margin', () => {
    const l = buildProjectLedger(baseInput({
      role: 'Field Crew',
      myOrgIds: ['fc'],
      approvedCORevenue: 0,
      approvedCOCost: 0,
      billed: 0,
      collected: 0,
      actualCostToDate: 0,
    }));
    expect(l.revisedContract.value).toBe(600000);
    expect(l.revisedCost.value).toBe(0);
    expect(l.forecastMargin.known).toBe(false);
    expect(l.forecastMargin.formula).toMatch(/not computable/i);
  });

  it('TC with a downstream contract still reports a margin', () => {
    const l = buildProjectLedger(baseInput());
    expect(l.forecastMargin.known).toBe(true);
    expect(l.forecastMargin.value).toBeCloseTo(213562, 2);
  });
});

describe('GC materials commitment excludes CO-scope estimates', () => {
  it('base-scope estimate only, so CO materials are not counted twice', () => {
    const gc = buildProjectLedger(baseInput({
      role: 'General Contractor',
      myOrgIds: ['gc'],
      ownerContractValue: 1400000,
      approvedCORevenue: 21650,
      approvedCOCost: 19744.5, // includes 5,204 of GC-procured CO materials
      materialCommitment: 345001.72, // BASE scope only (was 357,401.72)
      materialsAreMine: true,
      billed: 175000,
      collected: 175000,
      payablesApproved: 122986.84,
      payablesPaid: 122986.84,
      actualCostToDate: 122986.84,
    }));
    expect(gc.baseContract.value).toBe(1400000);
    expect(gc.baseCost.value).toBe(800000); // deduped TC contract, base value
    expect(gc.revisedCost.value).toBeCloseTo(1164746.22, 2);
    expect(gc.forecastMargin.value).toBeCloseTo(256903.78, 2);
    expect(gc.marginToDate.value).toBeCloseTo(52013.16, 2);
  });
});
