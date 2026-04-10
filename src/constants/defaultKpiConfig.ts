export interface KpiCardConfig {
  key: string;
  label: string;
  subtitle: string;
  enabled: boolean;
  order: number;
}

export const DEFAULT_KPI_GC: KpiCardConfig[] = [
  { key: 'total_owner_budget', label: 'Total Owner Budget', subtitle: 'Full portfolio value', enabled: true, order: 0 },
  { key: 'gc_profit_margin', label: 'General Contractor Profit Margin', subtitle: 'Owner budget minus Trade Contractor contracts', enabled: true, order: 1 },
  { key: 'change_orders', label: 'Change Orders', subtitle: 'Pending review count', enabled: true, order: 2 },
  { key: 'materials_gc_pos', label: 'Materials (General Contractor POs)', subtitle: 'Purchase order spend', enabled: true, order: 3 },
  { key: 'needs_attention', label: 'Needs Attention', subtitle: 'Items requiring response', enabled: true, order: 4 },
  { key: 'total_paid', label: 'Total Paid', subtitle: 'Outgoing payments to subs', enabled: true, order: 5 },
  { key: 'pending_gc_approval', label: 'Pending General Contractor Approval', subtitle: 'Invoices awaiting review', enabled: true, order: 6 },
  { key: 'tc_contracts_committed', label: 'Trade Contractor Contracts Committed', subtitle: 'Total Trade Contractor contract value', enabled: true, order: 7 },
];

export const DEFAULT_KPI_TC: KpiCardConfig[] = [
  { key: 'gc_contracts_revenue', label: 'General Contractor Contracts (Revenue)', subtitle: 'Revenue from General Contractor contracts', enabled: true, order: 0 },
  { key: 'fc_labor_contracts_cost', label: 'Field Crew / Labor Contracts (Cost)', subtitle: 'Field Crew costs', enabled: true, order: 1 },
  { key: 'gross_margin', label: 'Gross Margin', subtitle: 'Revenue minus costs', enabled: true, order: 2 },
  { key: 'change_orders', label: 'Change Orders', subtitle: 'Pending review count', enabled: true, order: 3 },
  { key: 'received_from_gc', label: 'Received from General Contractor', subtitle: 'Payments collected', enabled: true, order: 4 },
  { key: 'pending_from_gc', label: 'Pending from General Contractor', subtitle: 'Invoices awaiting General Contractor approval', enabled: true, order: 5 },
  { key: 'materials_tc_pos', label: 'Materials (Trade Contractor POs)', subtitle: 'Purchase order spend', enabled: true, order: 6 },
  { key: 'needs_attention', label: 'Needs Attention', subtitle: 'Items requiring response', enabled: true, order: 7 },
];

export const DEFAULT_KPI_FC: KpiCardConfig[] = [
  { key: 'contract_with_tc', label: 'Contract with Trade Contractor', subtitle: 'Active contract value', enabled: true, order: 0 },
  { key: 'net_margin', label: 'Net Margin', subtitle: 'Profit on contract + COs', enabled: true, order: 1 },
  { key: 'co_additions', label: 'CO Additions', subtitle: 'Approved change order value', enabled: true, order: 2 },
  { key: 'paid_by_tc', label: 'Paid by Trade Contractor', subtitle: 'Payments received', enabled: true, order: 3 },
  { key: 'pending_from_tc', label: 'Pending from Trade Contractor', subtitle: 'Invoices awaiting approval', enabled: true, order: 4 },
  { key: 'work_progress', label: 'Work Progress', subtitle: 'Completion percentage', enabled: true, order: 5 },
];

export const DEFAULT_KPI_SUPPLIER: KpiCardConfig[] = [
  { key: 'total_estimate_value', label: 'Total Estimate Value', subtitle: 'Across active projects', enabled: true, order: 0 },
  { key: 'total_ordered', label: 'Total Ordered', subtitle: 'Percentage of estimate', enabled: true, order: 1 },
  { key: 'extra_over_ordered', label: 'Extra / Over-Ordered', subtitle: 'Projects over estimate', enabled: true, order: 2 },
  { key: 'total_billed', label: 'Total Billed', subtitle: 'Invoiced amount', enabled: true, order: 3 },
  { key: 'total_received', label: 'Total Received', subtitle: 'Payments collected', enabled: true, order: 4 },
  { key: 'outstanding_balance', label: 'Outstanding Balance', subtitle: 'Remaining receivable', enabled: true, order: 5 },
];

export const DEFAULT_KPI_MAP: Record<string, KpiCardConfig[]> = {
  gc: DEFAULT_KPI_GC,
  tc: DEFAULT_KPI_TC,
  fc: DEFAULT_KPI_FC,
  supplier: DEFAULT_KPI_SUPPLIER,
};
