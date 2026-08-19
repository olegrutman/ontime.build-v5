// Pure helpers extracted from useProjectFinancials so the CO/WO aggregation
// math can be unit tested without mocking Supabase. Behavior must stay in
// lockstep with the inline logic in useProjectFinancials.ts.

export type COViewerRole =
  | 'General Contractor'
  | 'Trade Contractor'
  | 'Field Crew'
  | 'Supplier';

export interface ContractLike {
  from_role: string;
  to_role: string;
  from_org_id: string | null;
  to_org_id: string | null;
  trade?: string | null;
}

export interface COLike {
  id: string;
  status: string;
  document_type: 'CO' | 'WO' | string;
  tc_submitted_price?: number | null;
  materials_responsible?: string | null;
  equipment_responsible?: string | null;
  co_material_responsible_override?: string | null;
  co_equipment_responsible_override?: string | null;
}

export interface COLineRow {
  co_id: string;
  org_id: string;
  [key: string]: any;
}

export interface AggregatedCOTotals {
  approvedCORevenue: number;
  approvedCOCost: number;
  approvedCOMargin: number;
  pendingCOExposure: number;
  pendingCORevenue: number;
  pendingCOCost: number;
  pendingCONetAtRisk: number;
  approvedWOTotal: number;
}

export const PENDING_CO_STATUSES = [
  'submitted',
  'closed_for_pricing',
  'shared',
  'work_in_progress',
] as const;

/**
 * Statuses that count as locked-in / approved contract value. `contracted` and
 * `completed` are downstream of approval — the overview tables already treat
 * them as approved, so the financial rollup must agree or the KPI cards and the
 * CO tables disagree on the same project.
 */
export const APPROVED_CO_STATUSES = ['approved', 'contracted', 'completed'] as const;

/**
 * Resolve the org id whose CO line items represent revenue/cost for the viewer.
 * - GC viewer:  TC's org   (billing party of upstream TC↔GC contract)
 * - TC viewer:  TC's org   (own org as billing party upstream)
 * - FC viewer:  FC's org   (own org as billing party downstream)
 * Excludes T&M / Work Order contracts.
 */
export function resolveBillingOrgId(
  contracts: ContractLike[],
  viewerRole: COViewerRole,
): string | null {
  const notWO = (c: ContractLike) =>
    c.trade !== 'Work Order' && c.trade !== 'Work Order Labor';

  const upstream = contracts.find(
    (c) =>
      ((c.from_role === 'General Contractor' && c.to_role === 'Trade Contractor') ||
        (c.to_role === 'General Contractor' && c.from_role === 'Trade Contractor')) &&
      notWO(c),
  );
  const downstream = contracts.find(
    (c) =>
      ((c.from_role === 'Trade Contractor' && c.to_role === 'Field Crew') ||
        (c.to_role === 'Trade Contractor' && c.from_role === 'Field Crew')) &&
      notWO(c),
  );

  const tcOrgId = upstream
    ? upstream.from_role === 'Trade Contractor'
      ? upstream.from_org_id
      : upstream.to_org_id
    : null;
  const fcOrgId = downstream
    ? downstream.from_role === 'Field Crew'
      ? downstream.from_org_id
      : downstream.to_org_id
    : null;

  return viewerRole === 'Field Crew' ? fcOrgId : tcOrgId;
}

/**
 * Aggregate change_orders + line items into viewer-scoped totals.
 * Revenue uses tc_submitted_price for GC viewers when present (privacy /
 * locked-in markup); otherwise sums labor line_total + material billed +
 * equipment billed. Cost uses raw labor + material line_cost + equipment cost.
 */
export function aggregateCOTotals(
  cos: COLike[],
  labor: COLineRow[],
  materials: COLineRow[],
  equipment: COLineRow[],
  billingOrgId: string | null,
  isGCPerspective: boolean,
): AggregatedCOTotals {
  const empty: AggregatedCOTotals = {
    approvedCORevenue: 0,
    approvedCOCost: 0,
    approvedCOMargin: 0,
    pendingCOExposure: 0,
    pendingCORevenue: 0,
    pendingCOCost: 0,
    pendingCONetAtRisk: 0,
    approvedWOTotal: 0,
  };
  if (!billingOrgId || cos.length === 0) return empty;

  const sumScoped = (rows: COLineRow[], coId: string, field: string) =>
    rows
      .filter((r) => r.co_id === coId && r.org_id === billingOrgId)
      .reduce((s, r) => s + Number(r[field] ?? 0), 0);

  // Actual-cost labor rows record what was really spent — they are never
  // billable revenue (mirrors co_grand_total, which ignores them) but they must
  // count toward cost or margin comes out overstated.
  const sumLabor = (coId: string, opts: { billableOnly: boolean }) =>
    labor
      .filter(
        (r) =>
          r.co_id === coId &&
          r.org_id === billingOrgId &&
          (!opts.billableOnly || !r.is_actual_cost),
      )
      .reduce((s, r) => s + Number(r.line_total ?? 0), 0);

  const perCO = cos.map((c) => {
    const laborRevenue = sumLabor(c.id, { billableOnly: true });
    const laborCost = sumLabor(c.id, { billableOnly: false });
    // A snapshot of 0/null means "never priced" — fall back to the labor sum so
    // UI totals match the DB's co_grand_total (which drives contract_sum).
    const snapshot = Number(c.tc_submitted_price ?? 0);
    const revLabor =
      isGCPerspective && snapshot > 0 ? snapshot : laborRevenue;
    // Materials / equipment: mirror the DB's co_grand_total. Rows are stamped
    // with the org that *entered* them (often the GC on a TC's CO), so scoping
    // by billing org silently dropped them. Instead, drop the category when the
    // GC procures it — those dollars are paid on the GC's own PO.
    const matResp = c.co_material_responsible_override ?? c.materials_responsible ?? 'TC';
    const eqResp = c.co_equipment_responsible_override ?? c.equipment_responsible ?? 'TC';
    const sumAll = (rows: COLineRow[], field: string) =>
      rows.filter((r) => r.co_id === c.id).reduce((s, r) => s + Number(r[field] ?? 0), 0);
    const matRev = matResp === 'GC' ? 0 : sumAll(materials, 'billed_amount');
    const equipRev = eqResp === 'GC' ? 0 : sumAll(equipment, 'billed_amount');
    const matCost = matResp === 'GC' ? 0 : sumAll(materials, 'line_cost');
    const equipCost = eqResp === 'GC' ? 0 : sumAll(equipment, 'cost');
    return {
      status: c.status,
      document_type: c.document_type,
      revenue: revLabor + matRev + equipRev,
      cost: laborCost + matCost + equipCost,
    };
  });


  const isApproved = (s: string) =>
    (APPROVED_CO_STATUSES as readonly string[]).includes(s);
  const approved = perCO.filter((c) => isApproved(c.status));
  const pending = perCO.filter((c) => !isApproved(c.status));

  const approvedCORevenue = approved.reduce((s, c) => s + c.revenue, 0);
  const approvedCOCost = approved.reduce((s, c) => s + c.cost, 0);
  const pendingCORevenue = pending.reduce((s, c) => s + c.revenue, 0);
  const pendingCOCost = pending.reduce((s, c) => s + c.cost, 0);

  return {
    approvedCORevenue,
    approvedCOCost,
    approvedCOMargin: approvedCORevenue - approvedCOCost,
    pendingCOExposure: pendingCORevenue,
    pendingCORevenue,
    pendingCOCost,
    pendingCONetAtRisk: pendingCORevenue - pendingCOCost,
    approvedWOTotal: approved
      .filter((c) => c.document_type === 'WO')
      .reduce((s, c) => s + c.revenue, 0),
  };
}
