export type ReturnStatus = 
  | 'DRAFT' 
  | 'SUBMITTED' 
  | 'SUPPLIER_REVIEW' 
  | 'APPROVED' 
  | 'SCHEDULED' 
  | 'PICKED_UP' 
  | 'PRICED' 
  | 'CLOSED';

export type ReturnReason = 'Extra' | 'Wrong' | 'Estimate Over' | 'Damaged' | 'Other';
export type WrongType = 'Not Per Specification' | 'Wrong Item Shipped';
export type PickupType = 'Supplier Pickup' | 'Contractor Drop-off';
export type RestockingType = 'Percent' | 'Flat' | 'None';
export type UrgencyType = 'Standard' | 'Priority' | 'Urgent' | 'Emergency';

export type ReturnCondition =
  | 'New Unopened'
  | 'New Opened'
  | 'Good'
  | 'Damaged'
  | 'Wet'
  | 'Cut'
  | 'Painted'
  | 'Mixed'
  | 'Unknown';

export type ReturnableFlag = 'Pending' | 'Yes' | 'No';

export interface Return {
  id: string;
  project_id: string;
  supplier_org_id: string;
  created_by_org_id: string;
  created_by_user_id: string;
  return_number: string;
  reason: ReturnReason;
  wrong_type?: WrongType | null;
  reason_notes?: string | null;
  pickup_type?: PickupType | null;
  pickup_date?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  instructions?: string | null;
  urgency?: UrgencyType | null;
  status: ReturnStatus;
  credit_subtotal: number;
  restocking_type: RestockingType;
  restocking_value: number;
  restocking_total: number;
  net_credit_total: number;
  created_at: string;
  closed_at?: string | null;
  pricing_owner_org_id?: string | null;
  // Relations
  supplier_org?: { id: string; name: string } | null;
  created_by_org?: { id: string; name: string } | null;
  return_items?: ReturnItem[];
}

export interface ReturnItem {
  id: string;
  return_id: string;
  po_line_item_id: string;
  po_id: string;
  description_snapshot: string;
  uom: string;
  qty_requested: number;
  condition: ReturnCondition;
  condition_notes?: string | null;
  returnable_flag: ReturnableFlag;
  nonreturnable_reason?: string | null;
  credit_unit_price: number;
  credit_line_total: number;
  created_at: string;
}

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  SUPPLIER_REVIEW: 'Supplier Review',
  APPROVED: 'Approved',
  SCHEDULED: 'Scheduled',
  PICKED_UP: 'Picked Up',
  PRICED: 'Priced',
  CLOSED: 'Closed',
};

export const RETURN_STATUS_COLORS: Record<ReturnStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SUBMITTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  SUPPLIER_REVIEW: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  SCHEDULED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  PICKED_UP: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  PRICED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  CLOSED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export const RETURN_REASONS: ReturnReason[] = ['Extra', 'Wrong', 'Estimate Over', 'Damaged', 'Other'];

export const RETURN_REASON_DETAILS: Record<ReturnReason, { label: string; description: string }> = {
  Extra: { label: 'Extra Material', description: 'Ordered more than needed for the job' },
  Wrong: { label: 'Wrong Product', description: 'Item does not match specification or what was ordered' },
  'Estimate Over': { label: 'Estimate Overage', description: 'Estimated quantities exceeded actual usage' },
  Damaged: { label: 'Damaged on Delivery', description: 'Material arrived damaged or defective' },
  Other: { label: 'Other', description: 'None of the above — provide explanation' },
};

export const URGENCY_OPTIONS: UrgencyType[] = ['Standard', 'Priority', 'Urgent', 'Emergency'];

export const URGENCY_COLORS: Record<UrgencyType, string> = {
  Standard: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  Priority: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  Urgent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Emergency: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

export const RETURN_CONDITIONS: ReturnCondition[] = [
  'New Unopened', 'New Opened', 'Good', 'Damaged', 'Wet', 'Cut', 'Painted', 'Mixed', 'Unknown',
];

export const CONDITIONS_REQUIRING_NOTES: ReturnCondition[] = [
  'Damaged', 'Wet', 'Cut', 'Painted', 'Mixed', 'Unknown',
];
