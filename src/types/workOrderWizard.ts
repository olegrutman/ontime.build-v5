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
}

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
  
  // Step 4: Resources
  requires_materials: boolean;
  material_cost_responsibility: CostResponsibility | null;
  requires_equipment: boolean;
  equipment_cost_responsibility: CostResponsibility | null;
  
  // Step 5: Assignment
  assigned_org_id?: string | null;
  participant_org_ids?: string[];
  
  // Step 6: Review - AI generated description
  description: string;
}

export const INITIAL_WIZARD_DATA: WorkOrderWizardData = {
  title: '',
  location_data: {},
  work_type: null,
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
