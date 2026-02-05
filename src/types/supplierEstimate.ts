export type SupplierEstimateStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export interface SupplierProjectEstimate {
  id: string;
  supplier_org_id: string;
  project_id: string;
  work_order_id?: string | null;
  name: string;
  status: SupplierEstimateStatus;
  total_amount: number;
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  project?: { id: string; name: string } | null;
  work_order?: { id: string; title: string } | null;
}

export interface SupplierEstimateItem {
  id: string;
  estimate_id: string;
  supplier_sku?: string | null;
  description: string;
  quantity: number;
  uom: string;
  unit_price: number;
  line_total: number;
  notes?: string | null;
  pack_name?: string | null;
  catalog_item_id?: string | null;
  created_at: string;
}

export const ESTIMATE_STATUS_LABELS: Record<SupplierEstimateStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const ESTIMATE_STATUS_COLORS: Record<SupplierEstimateStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};
