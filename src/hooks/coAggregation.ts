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
    approvedWOTotal: 0,
  };
  if (!billingOrgId || cos.length === 0) return empty;

  const sumScoped = (rows: COLineRow[], coId: string, field: string) =>
    rows
      .filter((r) => r.co_id === coId && r.org_id === billingOrgId)
      .reduce((s, r) => s + Number(r[field] ?? 0), 0);

  const perCO = cos.map((c) => {
    const laborSum = sumScoped(labor, c.id, 'line_total');
    const revLabor =
      isGCPerspective && c.tc_submitted_price != null
        ? Number(c.tc_submitted_price)
        : laborSum;
    const matRev = sumScoped(materials, c.id, 'billed_amount');
    const equipRev = sumScoped(equipment, c.id, 'billed_amount');
    const matCost = sumScoped(materials, c.id, 'line_cost');
    const equipCost = sumScoped(equipment, c.id, 'cost');
    return {
      status: c.status,
      document_type: c.document_type,
      revenue: revLabor + matRev + equipRev,
      cost: laborSum + matCost + equipCost,
    };
  });

  const approved = perCO.filter((c) => c.status === 'approved');
  const pending = perCO.filter((c) => c.status !== 'approved');

  const approvedCORevenue = approved.reduce((s, c) => s + c.revenue, 0);
  const approvedCOCost = approved.reduce((s, c) => s + c.cost, 0);

  return {
    approvedCORevenue,
    approvedCOCost,
    approvedCOMargin: approvedCORevenue - approvedCOCost,
    pendingCOExposure: pending.reduce((s, c) => s + c.revenue, 0),
    approvedWOTotal: approved
      .filter((c) => c.document_type === 'WO')
      .reduce((s, c) => s + c.revenue, 0),
  };
}
