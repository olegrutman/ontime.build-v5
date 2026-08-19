import { describe, it, expect } from 'vitest';
import {
  aggregateCOTotals,
  resolveBillingOrgId,
  type ContractLike,
  type COLike,
  type COLineRow,
} from '@/hooks/coAggregation';

const TC = 'org-tc';
const FC = 'org-fc';
const GC = 'org-gc';
const OTHER = 'org-other';

const upstream = (over: Partial<ContractLike> = {}): ContractLike => ({
  from_role: 'General Contractor',
  to_role: 'Trade Contractor',
  from_org_id: GC,
  to_org_id: TC,
  trade: 'Framing',
  ...over,
});

const downstream = (over: Partial<ContractLike> = {}): ContractLike => ({
  from_role: 'Trade Contractor',
  to_role: 'Field Crew',
  from_org_id: TC,
  to_org_id: FC,
  trade: 'Framing',
  ...over,
});

describe('resolveBillingOrgId', () => {
  it('returns TC org for GC viewer (regardless of contract direction)', () => {
    expect(resolveBillingOrgId([upstream()], 'General Contractor')).toBe(TC);
    expect(
      resolveBillingOrgId(
        [upstream({ from_role: 'Trade Contractor', to_role: 'General Contractor', from_org_id: TC, to_org_id: GC })],
        'General Contractor',
      ),
    ).toBe(TC);
  });

  it('returns TC org for TC viewer', () => {
    expect(resolveBillingOrgId([upstream(), downstream()], 'Trade Contractor')).toBe(TC);
  });

  it('returns FC org for FC viewer (regardless of contract direction)', () => {
    expect(resolveBillingOrgId([upstream(), downstream()], 'Field Crew')).toBe(FC);
    expect(
      resolveBillingOrgId(
        [downstream({ from_role: 'Field Crew', to_role: 'Trade Contractor', from_org_id: FC, to_org_id: TC })],
        'Field Crew',
      ),
    ).toBe(FC);
  });

  it('ignores T&M / Work Order contracts when locating the framing contract', () => {
    const wo = upstream({ trade: 'Work Order', from_org_id: GC, to_org_id: OTHER });
    const woLabor = upstream({ trade: 'Work Order Labor', from_org_id: GC, to_org_id: OTHER });
    expect(resolveBillingOrgId([wo, woLabor, upstream()], 'General Contractor')).toBe(TC);
  });

  it('returns null when no relevant contract exists', () => {
    expect(resolveBillingOrgId([], 'General Contractor')).toBeNull();
    expect(resolveBillingOrgId([upstream()], 'Field Crew')).toBeNull();
  });
});

describe('aggregateCOTotals', () => {
  const co = (over: Partial<COLike> = {}): COLike => ({
    id: 'co-1',
    status: 'approved',
    document_type: 'CO',
    tc_submitted_price: null,
    ...over,
  });

  const row = (
    co_id: string,
    org_id: string,
    fields: Record<string, number>,
  ): COLineRow => ({ co_id, org_id, ...fields });

  it('returns zeros when billingOrgId is null', () => {
    const out = aggregateCOTotals([co()], [], [], [], null, false);
    expect(out).toEqual({
      approvedCORevenue: 0,
      approvedCOCost: 0,
      approvedCOMargin: 0,
      pendingCOExposure: 0,
      pendingCORevenue: 0,
      pendingCOCost: 0,
      pendingCONetAtRisk: 0,
      approvedWOTotal: 0,
    });
  });

  it('returns zeros when there are no COs', () => {
    const out = aggregateCOTotals([], [], [], [], TC, false);
    expect(out.approvedCORevenue).toBe(0);
    expect(out.pendingCOExposure).toBe(0);
  });

  it('sums labor + materials + equipment for approved COs (TC viewer)', () => {
    const cos = [co({ id: 'co-1' })];
    const labor = [row('co-1', TC, { line_total: 1000 })];
    const mats = [row('co-1', TC, { billed_amount: 500, line_cost: 400 })];
    const equip = [row('co-1', TC, { billed_amount: 200, cost: 150 })];

    const out = aggregateCOTotals(cos, labor, mats, equip, TC, false);
    expect(out.approvedCORevenue).toBe(1700); // 1000 + 500 + 200
    expect(out.approvedCOCost).toBe(550); // billable labor is not cost: 400 + 150
    expect(out.approvedCOMargin).toBe(1150);
    expect(out.pendingCOExposure).toBe(0);
  });

  it('excludes line rows whose org_id does not match billingOrgId (viewer scope)', () => {
    const cos = [co({ id: 'co-1' })];
    const labor = [
      row('co-1', TC, { line_total: 1000 }),
      row('co-1', FC, { line_total: 9999 }), // wrong org — should be ignored for TC viewer
      row('co-1', OTHER, { line_total: 5555 }),
    ];
    const out = aggregateCOTotals(cos, labor, [], [], TC, false);
    expect(out.approvedCORevenue).toBe(1000);
    expect(out.approvedCOCost).toBe(0);
  });

  it('uses tc_submitted_price as revenue for GC viewer, ignoring labor sum', () => {
    const cos = [co({ id: 'co-1', tc_submitted_price: 2500 })];
    const labor = [row('co-1', TC, { line_total: 1000 })]; // would be 1000 if not GC
    const mats = [row('co-1', TC, { billed_amount: 300, line_cost: 250 })];

    const out = aggregateCOTotals(cos, labor, mats, [], TC, true);
    // Revenue: tc_submitted_price (2500) + mats billed (300)
    expect(out.approvedCORevenue).toBe(2800);
    // Cost excludes billable labor: material line_cost only
    expect(out.approvedCOCost).toBe(250);
  });

  it('falls back to labor sum for GC viewer when tc_submitted_price is null', () => {
    const cos = [co({ tc_submitted_price: null })];
    const labor = [row('co-1', TC, { line_total: 800 })];
    const out = aggregateCOTotals(cos, labor, [], [], TC, true);
    expect(out.approvedCORevenue).toBe(800);
  });

  it('separates pending CO exposure from approved totals', () => {
    const cos: COLike[] = [
      co({ id: 'a', status: 'approved' }),
      co({ id: 'b', status: 'submitted' }),
      co({ id: 'c', status: 'shared' }),
      co({ id: 'd', status: 'work_in_progress' }),
      co({ id: 'e', status: 'closed_for_pricing' }),
      co({ id: 'f', status: 'rejected' }), // still "not approved", counted as pending in this helper
    ];
    const labor = cos.map((c) => row(c.id, TC, { line_total: 100 }));
    const out = aggregateCOTotals(cos, labor, [], [], TC, false);
    expect(out.approvedCORevenue).toBe(100);
    // 5 non-approved COs × 100
    expect(out.pendingCOExposure).toBe(500);
  });

  it('approvedWOTotal only includes approved COs with document_type = "WO"', () => {
    const cos: COLike[] = [
      co({ id: 'co-1', document_type: 'CO' }),
      co({ id: 'wo-1', document_type: 'WO' }),
      co({ id: 'wo-2', document_type: 'WO', status: 'submitted' }), // pending — excluded
    ];
    const labor = [
      row('co-1', TC, { line_total: 1000 }),
      row('wo-1', TC, { line_total: 400 }),
      row('wo-2', TC, { line_total: 999 }),
    ];
    const out = aggregateCOTotals(cos, labor, [], [], TC, false);
    expect(out.approvedWOTotal).toBe(400);
    expect(out.approvedCORevenue).toBe(1400);
  });

  it('aggregates correctly for FC viewer scoped to FC org', () => {
    const cos = [co()];
    const labor = [
      row('co-1', FC, { line_total: 600 }),
      row('co-1', TC, { line_total: 1000 }), // belongs to TC — excluded from FC view
    ];
    const out = aggregateCOTotals(cos, labor, [], [], FC, false);
    expect(out.approvedCORevenue).toBe(600);
    expect(out.approvedCOCost).toBe(0);
  });

  it('handles missing/null numeric fields without NaN', () => {
    const cos = [co()];
    const labor = [row('co-1', TC, {})];
    const mats = [row('co-1', TC, { billed_amount: 100 })]; // no line_cost
    const out = aggregateCOTotals(cos, labor, mats, [], TC, false);
    expect(out.approvedCORevenue).toBe(100);
    expect(out.approvedCOCost).toBe(0);
    expect(out.approvedCOMargin).toBe(100);
  });
});

describe('aggregateCOTotals — actual-cost labor', () => {
  const co = (over: Partial<COLike> = {}): COLike => ({
    id: 'co-1',
    status: 'approved',
    document_type: 'CO',
    tc_submitted_price: null,
    ...over,
  });

  it('excludes actual-cost labor from revenue but counts it as cost', () => {
    const labor: COLineRow[] = [
      { co_id: 'co-1', org_id: TC, line_total: 1730, is_actual_cost: false },
      { co_id: 'co-1', org_id: TC, line_total: 644, is_actual_cost: true },
    ];
    const out = aggregateCOTotals([co()], labor, [], [], TC, false);
    expect(out.approvedCORevenue).toBe(1730);
    expect(out.approvedCOCost).toBe(644);
    expect(out.approvedCOMargin).toBe(1730 - 644);
  });

  it('keeps the GC priced snapshot as revenue while cost includes actual costs', () => {
    const labor: COLineRow[] = [
      { co_id: 'co-1', org_id: TC, line_total: 1730, is_actual_cost: false },
      { co_id: 'co-1', org_id: TC, line_total: 644, is_actual_cost: true },
    ];
    const out = aggregateCOTotals(
      [co({ tc_submitted_price: 1170 })],
      labor,
      [],
      [],
      TC,
      true,
    );
    expect(out.approvedCORevenue).toBe(1170);
    expect(out.approvedCOCost).toBe(644);
  });
});

describe('aggregateCOTotals — field crew cost & responsibility fallback', () => {
  const co = (over: Partial<COLike> = {}): COLike => ({
    id: 'co-1',
    status: 'approved',
    document_type: 'CO',
    tc_submitted_price: null,
    ...over,
  });

  it('counts FC billable rows as TC cost', () => {
    const labor: COLineRow[] = [
      { id: 'l1', co_id: 'co-1', org_id: TC, line_total: 2000, is_actual_cost: false, entered_by_role: 'TC' },
      { id: 'f1', co_id: 'co-1', org_id: FC, line_total: 800, is_actual_cost: false, entered_by_role: 'FC' },
    ];
    const out = aggregateCOTotals([co()], labor, [], [], TC, false);
    expect(out.approvedCORevenue).toBe(2000);
    expect(out.approvedCOCost).toBe(800);
  });

  it('does not double count FC hours that were imported into an actual-cost row', () => {
    const labor: COLineRow[] = [
      { id: 'l1', co_id: 'co-1', org_id: TC, line_total: 2000, is_actual_cost: false, entered_by_role: 'TC' },
      { id: 'l2', co_id: 'co-1', org_id: TC, line_total: 800, is_actual_cost: true, entered_by_role: 'TC', source_fc_entry_ids: ['f1'] },
      { id: 'f1', co_id: 'co-1', org_id: FC, line_total: 800, is_actual_cost: false, entered_by_role: 'FC' },
    ];
    const out = aggregateCOTotals([co()], labor, [], [], TC, false);
    expect(out.approvedCOCost).toBe(800);
  });

  it('falls back to the contract responsibility when the CO leaves it NULL', () => {
    const cos = [co({ materials_responsible: null })];
    const mats = [row2('co-1', GC, { billed_amount: 4824, line_cost: 4824 })];
    const gcProcured = aggregateCOTotals(cos, [], mats, [], TC, false, { materials: 'GC' });
    expect(gcProcured.approvedCORevenue).toBe(0);
    expect(gcProcured.approvedCOCost).toBe(0);
    const tcProcured = aggregateCOTotals(cos, [], mats, [], TC, false, { materials: 'TC' });
    expect(tcProcured.approvedCORevenue).toBe(4824);
    expect(tcProcured.approvedCOCost).toBe(4824);
  });
});

function row2(co_id: string, org_id: string, fields: Record<string, number>): COLineRow {
  return { co_id, org_id, ...fields };
}
