export type TMPeriodStatus = 'OPEN' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type TMPeriodType = 'DAILY' | 'WEEKLY';

export interface TMPeriod {
  id: string;
  work_item_id: string;
  period_start: string;
  period_end: string;
  period_type: string;
  status: string;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_notes: string | null;
  labor_total: number | null;
  material_total: number | null;
  markup_percent: number | null;
  final_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface TMLaborEntry {
  id: string;
  period_id: string;
  entry_date: string;
  hours: number;
  description: string | null;
  entered_by: string;
  hourly_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface TMMaterialEntry {
  id: string;
  period_id: string;
  entry_date: string;
  description: string;
  quantity: number;
  uom: string;
  unit_cost: number | null;
  supplier_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TMBillableSlice {
  id: string;
  period_id: string;
  work_item_id: string;
  slice_number: number;
  labor_amount: number;
  material_amount: number;
  markup_amount: number;
  total_amount: number;
  invoiced_at: string | null;
  invoice_reference: string | null;
  created_at: string;
}
