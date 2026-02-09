// Change Order Mini-Project Types

export interface LocationData {
  inside_outside?: 'inside' | 'outside';
  level?: string; // Floor, Roof, Basement, etc.
  unit?: string;
  room_area?: string; // Kitchen, Bathroom, Corridor, etc.
  custom_room_area?: string; // When "Other" is selected
  exterior_feature?: string; // e.g., "balcony_left", "siding_front", "roof_deck"
  custom_exterior?: string; // When "Other" is selected
}

export type ChangeOrderWorkType = 
  | 'reframe'
  | 'reinstall'
  | 'addition'
  | 'adjust'
  | 'fixing';

export type ChangeOrderStatus =
  | 'draft'
  | 'fc_input'
  | 'tc_pricing'
  | 'ready_for_approval'
  | 'approved'
  | 'rejected'
  | 'contracted';

export type CostResponsibility = 'GC' | 'TC';

export type ParticipantRole = 'GC' | 'TC' | 'FC' | 'SUPPLIER';

export interface ChangeOrderProject {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  location_data: LocationData;
  work_type: ChangeOrderWorkType | null;
  requires_materials: boolean;
  material_cost_responsibility: CostResponsibility | null;
  requires_equipment: boolean;
  equipment_cost_responsibility: CostResponsibility | null;
  pricing_mode: 'fixed' | 'tm';
  status: ChangeOrderStatus;
  labor_total: number;
  material_total: number;
  equipment_total: number;
  final_price: number;
  rejection_notes: string | null;
  reason: string | null;
  fixing_trade_notes: string | null;
  created_by: string;
  created_by_role: string | null;
  created_at: string;
  updated_at: string;
  
  // Linked PO for materials
  linked_po_id?: string | null;
  
  // Material markup (when TC is cost-responsible)
  material_markup_type?: 'percent' | 'lump_sum' | null;
  material_markup_percent?: number;
  material_markup_amount?: number;
  
  // Materials pricing lock (TC locks in their markup)
  materials_pricing_locked?: boolean;
  materials_locked_at?: string | null;
  
  // Joined data
  project?: {
    id: string;
    name: string;
    address?: string;
  };
}

export interface ChangeOrderParticipant {
  id: string;
  change_order_id: string;
  organization_id: string;
  role: ParticipantRole;
  is_active: boolean;
  invited_by: string;
  invited_at: string;
  accepted_at: string | null;
  organization?: {
    id: string;
    org_code: string;
    name: string;
    type: string;
  };
}

export interface ChangeOrderFCHours {
  id: string;
  change_order_id: string;
  description: string | null;
  pricing_type: LaborPricingType;
  hours: number;
  hourly_rate: number | null;
  lump_sum: number | null;
  labor_total: number;
  is_locked: boolean;
  locked_at: string | null;
  locked_by: string | null;
  unlock_requested: boolean;
  unlock_requested_at: string | null;
  entered_by: string;
  created_at: string;
  updated_at: string;
}

export type LaborPricingType = 'hourly' | 'lump_sum';

export interface ChangeOrderTCLabor {
  id: string;
  change_order_id: string;
  description: string | null;
  pricing_type: LaborPricingType;
  hours: number;
  hourly_rate: number | null;
  lump_sum: number | null;
  labor_total: number;
  entered_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChangeOrderMaterial {
  id: string;
  change_order_id: string;
  description: string;
  quantity: number;
  uom: string;
  notes: string | null;
  unit_cost: number | null;
  line_total: number;
  sent_to_supplier: boolean;
  supplier_id: string | null;
  supplier_priced: boolean;
  supplier_price: number | null;
  supplier_locked: boolean;
  supplier_locked_at: string | null;
  markup_percent: number;
  final_price: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  
  // Joined
  supplier?: {
    id: string;
    name: string;
  };
}

export interface ChangeOrderEquipment {
  id: string;
  change_order_id: string;
  description: string;
  pricing_type: 'flat' | 'daily';
  daily_rate: number | null;
  days: number;
  flat_cost: number | null;
  total_cost: number | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ChangeOrderChecklist {
  id: string;
  change_order_id: string;
  location_complete: boolean;
  scope_complete: boolean;
  fc_hours_locked: boolean;
  tc_pricing_complete: boolean;
  materials_priced: boolean;
  equipment_priced: boolean;
  updated_at: string;
}

// Linked PO data with full line items
export interface LinkedPOLineItem {
  id: string;
  line_number: number;
  description: string;
  quantity: number;
  uom: string;
  length_ft?: number | null;
  unit_price?: number | null;
  line_total?: number | null;
}

export interface LinkedPOData {
  id: string;
  po_number: string;
  status: string;
  subtotal?: number;
  itemCount?: number;
  items?: LinkedPOLineItem[];
}

// Wizard form data
export interface ChangeOrderWizardData {
  // Step 1: Title (optional, auto-generated from location)
  title: string;
  
  // Step 2: Location
  location_data: LocationData;
  
  // Step 3: Work Type
  work_type: ChangeOrderWorkType | null;
  
  // Reason for the work order (especially for fixing)
  reason?: string;
  
  // Notes about which trade caused the issue (when fixing due to other trades)
  fixing_trade_notes?: string;
  
  // Step 4: Description (AI-generated or manual)
  description: string;
  
  // Step 5: Materials
  requires_materials: boolean;
  material_cost_responsibility: CostResponsibility | null;
  
  // Step 6: Equipment
  requires_equipment: boolean;
  equipment_cost_responsibility: CostResponsibility | null;
  
  // Assigned contractor (TC for GC creators, FC for TC creators)
  assigned_org_id?: string | null;
  
  // Additional participants toggled on
  participant_org_ids?: string[];
}

// Status labels
export const CHANGE_ORDER_STATUS_LABELS: Record<ChangeOrderStatus, string> = {
  draft: 'In Progress',
  fc_input: 'Field Crew Input',
  tc_pricing: 'Trade Contractor Pricing',
  ready_for_approval: 'Ready for Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  contracted: 'Contracted',
};

export const WORK_TYPE_LABELS: Record<ChangeOrderWorkType, string> = {
  reframe: 'Re-frame',
  reinstall: 'Re-install',
  addition: 'Addition',
  adjust: 'Adjust',
  fixing: 'Fixing',
};

export const LEVEL_OPTIONS = [
  'Floor 1',
  'Floor 2',
  'Floor 3',
  'Floor 4',
  'Floor 5',
  'Basement',
  'Roof',
  'Attic',
  'Mezzanine',
  'Other',
];

export const ROOM_AREA_OPTIONS = [
  'Kitchen',
  'Bathroom',
  'Living Room',
  'Bedroom',
  'Corridor',
  'Hallway',
  'Garage',
  'Laundry',
  'Storage',
  'Exterior',
  'Other',
];
