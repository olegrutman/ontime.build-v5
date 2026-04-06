export interface KpiCardConfig {
  key: string;
  label: string;
  subtitle: string;
  enabled: boolean;
  order: number;
}

export const DEFAULT_KPI_GC: KpiCardConfig[] = [
  { key: 'contract_value', label: 'Contract Value', subtitle: 'Total awarded contract value', enabled: true, order: 0 },
  { key: 'paid_out', label: 'Paid Out', subtitle: 'Total payments made to subs', enabled: true, order: 1 },
  { key: 'received', label: 'Received', subtitle: 'Total payments received from owner', enabled: true, order: 2 },
  { key: 'projected_margin', label: 'Projected Margin', subtitle: 'Estimated profit margin', enabled: true, order: 3 },
];

export const DEFAULT_KPI_TC: KpiCardConfig[] = [
  { key: 'contract_in', label: 'Contract In', subtitle: 'Value of contracts awarded to you', enabled: true, order: 0 },
  { key: 'cost_out', label: 'Cost Out', subtitle: 'Total costs paid to field crews', enabled: true, order: 1 },
  { key: 'projected_margin', label: 'Projected Margin', subtitle: 'Estimated profit on contracts', enabled: true, order: 2 },
  { key: 'materials_forecast', label: 'Materials Forecast', subtitle: 'Upcoming material spend estimate', enabled: true, order: 3 },
];

export const DEFAULT_KPI_FC: KpiCardConfig[] = [
  { key: 'contract_value', label: 'Contract Value', subtitle: 'Total value of your contracts', enabled: true, order: 0 },
  { key: 'collected', label: 'Collected', subtitle: 'Payments received to date', enabled: true, order: 1 },
  { key: 'outstanding', label: 'Outstanding', subtitle: 'Unpaid balance remaining', enabled: true, order: 2 },
];

export const DEFAULT_KPI_SUPPLIER: KpiCardConfig[] = [
  { key: 'total_receivable', label: 'Total Receivable', subtitle: 'Outstanding invoices total', enabled: true, order: 0 },
  { key: 'paid_this_month', label: 'Paid This Month', subtitle: 'Payments received this month', enabled: true, order: 1 },
  { key: 'open_orders', label: 'Open Orders', subtitle: 'Active material orders', enabled: true, order: 2 },
  { key: 'credit_exposure', label: 'Credit Exposure', subtitle: 'Total unpaid credit extended', enabled: true, order: 3 },
];

export const DEFAULT_KPI_MAP: Record<string, KpiCardConfig[]> = {
  gc: DEFAULT_KPI_GC,
  tc: DEFAULT_KPI_TC,
  fc: DEFAULT_KPI_FC,
  supplier: DEFAULT_KPI_SUPPLIER,
};
