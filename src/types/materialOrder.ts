export type OrderStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'FULFILLED' | 'CANCELLED';
export type OrderingMode = 'PACKS' | 'ITEMS';
export type WorkItemType = 'PROJECT' | 'SOV_ITEM' | 'CHANGE_WORK' | 'TM_WORK';
export type WorkItemState = 'OPEN' | 'PRICED' | 'APPROVED' | 'EXECUTED' | 'CLOSED';

export interface WorkItem {
  id: string;
  organization_id: string;
  parent_work_item_id?: string | null;
  project_id?: string | null;
  item_type: string; // Using string to match DB response
  title: string;
  description?: string | null;
  state: string; // Using string to match DB response
  location_ref?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialOrder {
  id: string;
  work_item_id: string;
  supplier_id?: string | null;
  order_number?: string | null;
  status: string; // Using string to match DB response
  ordering_mode: string; // Using string to match DB response
  notes?: string | null;
  submitted_at?: string | null;
  submitted_by?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  created_at: string;
  updated_at: string;
  work_item?: { id: string; title: string; item_type: string; location_ref?: string | null } | null;
  supplier?: { id: string; name: string; supplier_code: string } | null;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  pack_id?: string;
  catalog_item_id?: string;
  supplier_sku?: string;
  description: string;
  category?: string;
  quantity: number;
  uom: string;
  pieces?: number;
  length_ft?: number;
  width_in?: number;
  thickness_in?: number;
  computed_bf?: number;
  computed_lf?: number;
  notes?: string;
  from_pack: boolean;
  created_at: string;
  updated_at: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  FULFILLED: 'Fulfilled',
  CANCELLED: 'Cancelled',
};

export const WORK_ITEM_TYPE_LABELS: Record<WorkItemType, string> = {
  PROJECT: 'Project',
  SOV_ITEM: 'SOV Item',
  CHANGE_WORK: 'Change Work',
  TM_WORK: 'T&M Work',
};

// Standard dimensional lumber sizes (nominal → actual)
export const DIMENSIONAL_SIZES = [
  { nominal: '2x4', thickness: 1.5, width: 3.5 },
  { nominal: '2x6', thickness: 1.5, width: 5.5 },
  { nominal: '2x8', thickness: 1.5, width: 7.25 },
  { nominal: '2x10', thickness: 1.5, width: 9.25 },
  { nominal: '2x12', thickness: 1.5, width: 11.25 },
  { nominal: '4x4', thickness: 3.5, width: 3.5 },
  { nominal: '4x6', thickness: 3.5, width: 5.5 },
  { nominal: '6x6', thickness: 5.5, width: 5.5 },
];

export const STANDARD_LENGTHS = [8, 10, 12, 14, 16, 18, 20];

// Calculate board feet: (T × W × L) / 144 × pieces
export function calculateBoardFeet(
  thicknessIn: number,
  widthIn: number,
  lengthFt: number,
  pieces: number
): number {
  return ((thicknessIn * widthIn * (lengthFt * 12)) / 144) * pieces;
}

// Calculate linear feet: pieces × length
export function calculateLinearFeet(lengthFt: number, pieces: number): number {
  return lengthFt * pieces;
}
