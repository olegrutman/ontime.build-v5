export type InvoiceStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';

export interface Invoice {
  id: string;
  project_id: string;
  contract_id: string | null;
  sov_id: string | null;
  invoice_number: string;
  billing_period_start: string;
  billing_period_end: string;
  status: InvoiceStatus;
  subtotal: number;
  retainage_amount: number;
  total_amount: number;
  notes: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  paid_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  work_item_id: string | null;
  description: string;
  scheduled_value: number;
  previous_billed: number;
  current_billed: number;
  total_billed: number;
  retainage_percent: number;
  retainage_amount: number;
  sort_order: number;
  created_at: string;
}

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  PAID: 'Paid',
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  PAID: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};
