export type POStatus = 'ACTIVE' | 'SUBMITTED' | 'PRICED' | 'ORDERED' | 'DELIVERED';

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  project_id?: string | null;
  work_item_id?: string | null;
  material_order_id?: string | null;
  supplier_id: string;
  po_number: string;
  po_name: string;
  status: POStatus;
  notes?: string | null;
  sent_at?: string | null;
  sent_by?: string | null;
  submitted_at?: string | null;
  submitted_by?: string | null;
  priced_at?: string | null;
  priced_by?: string | null;
  ordered_at?: string | null;
  delivered_at?: string | null;
  download_token?: string;
  sales_tax_percent?: number | null;
  // Estimate/pack origin
  source_estimate_id?: string | null;
  source_pack_name?: string | null;
  pack_modified?: boolean | null;
  created_at: string;
  updated_at: string;
  // Pricing visibility
  created_by_org_id?: string | null;
  pricing_owner_org_id?: string | null;
  // PO-level totals
  po_subtotal_estimate_items?: number | null;
  po_subtotal_non_estimate_items?: number | null;
  po_subtotal_total?: number | null;
  po_tax_total?: number | null;
  po_total?: number | null;
  tax_percent_applied?: number | null;
  // Relations
  organization?: { name: string; org_code: string } | null;
  supplier?: { id: string; name: string; supplier_code: string; contact_info?: string | null; organization_id?: string } | null;
  project?: { id: string; name: string } | null;
  work_item?: { id: string; title: string } | null;
  line_items?: POLineItem[];
}

export interface POLineItem {
  id: string;
  po_id: string;
  line_number: number;
  supplier_sku?: string | null;
  description: string;
  quantity: number;
  uom: string;
  pieces?: number | null;
  length_ft?: number | null;
  computed_bf?: number | null;
  computed_lf?: number | null;
  unit_price?: number | null;
  line_total?: number | null;
  notes?: string | null;
  // Supplier pricing
  lead_time_days?: number | null;
  supplier_notes?: string | null;
  // Pricing traceability
  source_estimate_item_id?: string | null;
  source_pack_name?: string | null;
  price_source?: string | null;
  original_unit_price?: number | null;
  price_adjusted_by_supplier?: boolean;
  adjustment_reason?: string | null;
  created_at: string;
}

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  ACTIVE: 'Active',
  SUBMITTED: 'Submitted',
  PRICED: 'Priced',
  ORDERED: 'Ordered',
  DELIVERED: 'Delivered',
};

export const PO_STATUS_COLORS: Record<POStatus, string> = {
  ACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  PRICED: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  ORDERED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  DELIVERED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};
