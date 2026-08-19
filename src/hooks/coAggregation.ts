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
  /** Owner-facing price the GC set for this CO. Null/0 = not priced yet. */
  gc_budget?: number | null;
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

/**
 * Cost split so a card can say *where* the money goes. `ownLabor` is the
 * viewer's own crew / internal cost rows; `subcontract` is what an OUTSIDE
 * field-crew company bills the viewer. They are never mixed: an external FC is
 * a subcontract cost, not internal labor.
 */
export interface COCostBreakdown {
  ownLabor: number;
  subcontract: number;
  materials: number;
  equipment: number;
  total: number;
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
  approvedCostBreakdown: COCostBreakdown;
  pendingCostBreakdown: COCostBreakdown;
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
 *
 * Revenue = the viewer's own billable rows (or the frozen tc_submitted_price
 * snapshot for GC viewers) + material/equipment billed for the categories the
 * viewer actually carries.
 *
 * Cost = what the viewer really pays out: their own actual-cost rows (internal
 * cost / imported field hours) plus downstream field-crew billables that were
 * NOT already imported, + material/equipment line cost they carry. Billable
 * rows are never cost — counting them made cost mirror revenue and produced
 * phantom "field crew cost".
 *
 * `fallbackResponsibility` mirrors the DB (`co_grand_total`): when a CO leaves
 * materials/equipment responsibility NULL, the contract's value decides.
 */
export function aggregateCOTotals(
  cos: COLike[],
  labor: COLineRow[],
  materials: COLineRow[],
  equipment: COLineRow[],
  billingOrgId: string | null,
  isGCPerspective: boolean,
  fallbackResponsibility?: { materials?: string | null; equipment?: string | null },
): AggregatedCOTotals {
  const emptyBreakdown = (): COCostBreakdown => ({
    ownLabor: 0, subcontract: 0, materials: 0, equipment: 0, total: 0,
  });
  const empty: AggregatedCOTotals = {
    approvedCORevenue: 0,
    approvedCOCost: 0,
    approvedCOMargin: 0,
    pendingCOExposure: 0,
    pendingCORevenue: 0,
    pendingCOCost: 0,
    pendingCONetAtRisk: 0,
    approvedWOTotal: 0,
    approvedCostBreakdown: emptyBreakdown(),
    pendingCostBreakdown: emptyBreakdown(),
  };
  if (!billingOrgId || cos.length === 0) return empty;

  const num = (v: unknown) => Number(v ?? 0);

  const perCO = cos.map((c) => {
    const rows = labor.filter((r) => r.co_id === c.id);
    const mine = rows.filter((r) => r.org_id === billingOrgId);

    // Revenue: the viewer's billable rows only.
    const laborRevenue = mine
      .filter((r) => !r.is_actual_cost)
      .reduce((s, r) => s + num(r.line_total), 0);

    // Own labor cost: the viewer's own actual-cost rows (their crew / internal
    // burden). An outside field-crew company never lands here.
    const actualRows = mine.filter((r) => r.is_actual_cost);
    const ownLaborCost = actualRows.reduce((s, r) => s + num(r.line_total), 0);
    // Subcontract cost: an EXTERNAL field crew's billables that were not
    // already imported into an actual-cost row (imports carry the source ids,
    // so we dedupe on them).
    const importedFCIds = new Set<string>(
      actualRows.flatMap((r) => (r.source_fc_entry_ids as string[] | null) ?? []),
    );
    const subcontractCost = rows
      .filter(
        (r) =>
          r.entered_by_role === 'FC' &&
          !r.is_actual_cost &&
          r.org_id !== billingOrgId &&
          !(r.id && importedFCIds.has(r.id as string)),
      )
      .reduce((s, r) => s + num(r.line_total), 0);

    // A snapshot of 0/null means "never priced" — fall back to the labor sum so
    // UI totals match the DB's co_grand_total (which drives contract_sum).
    const snapshot = num(c.tc_submitted_price);
    const revLabor =
      isGCPerspective && snapshot > 0 ? snapshot : laborRevenue;
    // Materials / equipment: mirror the DB's co_grand_total. Rows are stamped
    // with the org that *entered* them (often the GC on a TC's CO), so scoping
    // by billing org silently dropped them. Instead, drop the category when the
    // GC procures it — those dollars are paid on the GC's own PO.
    const matResp =
      c.co_material_responsible_override ??
      c.materials_responsible ??
      fallbackResponsibility?.materials ??
      'TC';
    const eqResp =
      c.co_equipment_responsible_override ??
      c.equipment_responsible ??
      fallbackResponsibility?.equipment ??
      'TC';
    const sumAll = (rowsIn: COLineRow[], field: string) =>
      rowsIn.filter((r) => r.co_id === c.id).reduce((s, r) => s + num(r[field]), 0);

    const matRev = matResp === 'GC' ? 0 : sumAll(materials, 'billed_amount');
    const equipRev = eqResp === 'GC' ? 0 : sumAll(equipment, 'billed_amount');
    const matCost = matResp === 'GC' ? 0 : sumAll(materials, 'line_cost');
    const equipCost = eqResp === 'GC' ? 0 : sumAll(equipment, 'cost');

    if (isGCPerspective) {
      // For a GC an approved CO is first of all a COST: the amount owed to the
      // TC (the frozen billable snapshot, which already excludes anything the
      // GC procures) plus the GC-procured materials/equipment it buys at cost
      // on its own POs. It only becomes revenue once the GC prices it to the
      // owner via `gc_budget`; with no owner price we fall back to cost, i.e.
      // a 0% markup pass-through, and flag it so the card can warn.
      const owedToTC = snapshot > 0 ? snapshot : revLabor + matRev + equipRev;
      const gcMatCost = matResp === 'GC' ? sumAll(materials, 'line_cost') : 0;
      const gcEquipCost = eqResp === 'GC' ? sumAll(equipment, 'cost') : 0;
      const gcCost = owedToTC + gcMatCost + gcEquipCost;
      const ownerBudget = num(c.gc_budget);
      return {
        status: c.status,
        document_type: c.document_type,
        revenue: ownerBudget > 0 ? ownerBudget : gcCost,
        cost: gcCost,
        ownLabor: 0,
        subcontract: owedToTC,
        materials: gcMatCost,
        equipment: gcEquipCost,
        ownerBudgetSet: ownerBudget > 0,
      };
    }

    return {
      status: c.status,
      document_type: c.document_type,
      revenue: revLabor + matRev + equipRev,
      cost: ownLaborCost + subcontractCost + matCost + equipCost,
      ownLabor: ownLaborCost,
      subcontract: subcontractCost,
      materials: matCost,
      equipment: equipCost,
      ownerBudgetSet: true,
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

  const breakdown = (list: typeof perCO): COCostBreakdown => ({
    ownLabor: list.reduce((s, c) => s + c.ownLabor, 0),
    subcontract: list.reduce((s, c) => s + c.subcontract, 0),
    materials: list.reduce((s, c) => s + c.materials, 0),
    equipment: list.reduce((s, c) => s + c.equipment, 0),
    total: list.reduce((s, c) => s + c.cost, 0),
  });

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
    approvedCostBreakdown: breakdown(approved),
    pendingCostBreakdown: breakdown(pending),
  };
}
