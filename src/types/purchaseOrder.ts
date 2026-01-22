export type POStatus = 'DRAFT' | 'SENT';

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  project_id?: string | null;
  work_item_id?: string | null;
  material_order_id?: string | null;
  supplier_id: string;
  po_number: string;
  po_name: string;
  status: string;
  notes?: string | null;
  sent_at?: string | null;
  sent_by?: string | null;
  download_token?: string;
  created_at: string;
  updated_at: string;
  organization?: { name: string; org_code: string } | null;
  supplier?: { id: string; name: string; supplier_code: string; contact_info?: string | null } | null;
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
  notes?: string | null;
  created_at: string;
}

export const PO_STATUS_LABELS: Record<POStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent',
};
