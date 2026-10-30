import { toCents } from '@/lib/money';

interface LaborCostRow {
  id?: string;
  org_id: string;
  entered_by_role?: string;
  is_actual_cost?: boolean;
  source_fc_entry_ids?: string[] | null;
  line_total?: number | null;
}

/** Imported crew costs and their original billables are one obligation, independent of pricing mode. */
export function coLaborCost(rows: LaborCostRow[], billingOrgId: string | null) {
  if (!billingOrgId) return { ownLabor: 0, subcontract: 0, total: 0 };
  const ownRows = rows.filter(row => row.org_id === billingOrgId && row.is_actual_cost);
  const importedIds = new Set(ownRows.flatMap(row => row.source_fc_entry_ids ?? []));
  const ownLabor = toCents(ownRows.reduce((sum, row) => sum + Number(row.line_total || 0), 0));
  const subcontract = toCents(rows.filter(row => row.org_id !== billingOrgId && row.entered_by_role === 'FC' && !row.is_actual_cost && (!row.id || !importedIds.has(row.id))).reduce((sum, row) => sum + Number(row.line_total || 0), 0));
  return { ownLabor, subcontract, total: toCents(ownLabor + subcontract) };
}