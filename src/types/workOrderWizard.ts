import { CostResponsibility, ChangeOrderWorkType, LocationData } from './changeOrderProject';

// Reason options for fixing work type
export const FIXING_REASON_OPTIONS = [
  { value: 'other_trade', label: "Other Trade's Mistake" },
  { value: 'design_error', label: 'Design Error' },
  { value: 'material_defect', label: 'Material Defect' },
  { value: 'weather_damage', label: 'Weather Damage' },
  { value: 'owner_damage', label: 'Owner/Tenant Damage' },
  { value: 'code_requirement', label: 'Code Requirement' },
  { value: 'other', label: 'Other' },
];

// Extended location data for work order wizard
export interface WorkOrderLocationData extends LocationData {
  custom_room_area?: string;
  exterior_feature?: string;
  custom_exterior?: string;
  exterior_level?: string;
  exterior_feature_type?: string;
  exterior_direction?: string;
}

export const EXTERIOR_FEATURE_OPTIONS = [
  'Balcony',
  'Deck',
  'Porch',
  'Siding',
  'Roof',
  'Windows',
  'Doors',
  'Fascia',
  'Soffit',
  'Gutters',
  'Other',
];

export const EXTERIOR_DIRECTION_OPTIONS = [
  'Front',
  'Back',
  'Left',
  'Right',
  'North',
  'South',
  'East',
  'West',
  'General',
];

// Scope detail options
export const STRUCTURAL_ELEMENT_OPTIONS = [
  'Wall', 'Header', 'Beam', 'Joist', 'Rafter', 'Truss',
  'Post/Column', 'Sill Plate', 'Top Plate', 'Stud', 'Blocking',
  'Sheathing', 'Subfloor', 'Stairway', 'Other',
];

export const SCOPE_SIZE_OPTIONS = [
  'Single Item', 'Partial Wall/Section', 'Full Wall',
  'Multiple Walls', 'Entire Room', 'Entire Floor', 'Other',
];

export const URGENCY_OPTIONS = [
  'Standard', 'Priority', 'Urgent', 'Emergency',
];

export const ACCESS_CONDITIONS_OPTIONS = [
  'Clear Access', 'Scaffold Required', 'Lift Required',
  'Ladder Only', 'Confined Space', 'Other',
];

export const EXISTING_CONDITIONS_OPTIONS = [
  'New Construction', 'Partially Complete', 'Needs Demo First',
  'Damaged/Compromised', 'Standing but Incorrect', 'Other',
];

// Work Order Wizard step data
export interface WorkOrderWizardData {
  // Step 1: Title
  title: string;
  
  // Step 2: Location
  location_data: WorkOrderLocationData;
  
  // Step 3: Work Type
  work_type: ChangeOrderWorkType | null;
  reason?: string;
  fixing_trade_notes?: string;
  
  // Step 4: Scope Details
  structural_element?: string;
  scope_size?: string;
  urgency?: string;
  access_conditions?: string;
  existing_conditions?: string;
  
  // Step 5: Pricing Mode
  pricing_mode: 'fixed' | 'tm';
  
  // Step 6: Resources
  requires_materials: boolean;
  material_cost_responsibility: CostResponsibility | null;
  requires_equipment: boolean;
  equipment_cost_responsibility: CostResponsibility | null;
  
  // Step 7: Assignment
  assigned_org_id?: string | null;
  
  // Step 8: Review - AI generated description
  description: string;
}

export const INITIAL_WIZARD_DATA: WorkOrderWizardData = {
  title: '',
  location_data: {},
  work_type: null,
  structural_element: undefined,
  scope_size: undefined,
  urgency: undefined,
  access_conditions: undefined,
  existing_conditions: undefined,
  pricing_mode: 'fixed',
  requires_materials: false,
  material_cost_responsibility: null,
  requires_equipment: false,
  equipment_cost_responsibility: null,
  description: '',
};

// Work order room/area options
export const ROOM_AREA_OPTIONS = [
  'Kitchen',
  'Bathroom',
  'Living Room',
  'Bedroom',
  'Master Bedroom',
  'Master Bath',
  'Dining Room',
  'Corridor',
  'Hallway',
  'Closet',
  'Garage',
  'Laundry',
  'Storage',
  'Utility Room',
  'Office',
  'Den',
  'Other',
];
