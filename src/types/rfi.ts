import { LocationData } from './location';

export type RFIStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';
export type RFIPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type RFICategory =
  | 'dimensions'
  | 'product_material'
  | 'design_clarification'
  | 'structural'
  | 'mep_coordination'
  | 'general';

export interface RFICategoryInfo {
  key: RFICategory;
  label: string;
  description: string;
}

export const RFI_CATEGORIES: RFICategoryInfo[] = [
  { key: 'dimensions', label: 'Dimensions', description: 'Heights, widths, spacing, openings' },
  { key: 'product_material', label: 'Product / Material', description: 'Products, lumber, fasteners, finishes' },
  { key: 'design_clarification', label: 'Design Clarification', description: 'Plan conflicts, drawing references, fire ratings' },
  { key: 'structural', label: 'Structural', description: 'Bearing points, beams, joists, connectors' },
  { key: 'mep_coordination', label: 'MEP Coordination', description: 'Penetrations, rough-ins, fire-stopping' },
  { key: 'general', label: 'General', description: 'Free-form question' },
];

export interface RFIPromptField {
  key: string;
  label: string;
  type: 'input' | 'select' | 'textarea';
  placeholder?: string;
  options?: string[]; // for select type
  unit?: boolean; // show unit selector beside input
}

export interface RFIQuestionTemplate {
  id: string;
  category: RFICategory;
  label: string;
  subjectSuffix: string; // used to build auto-subject
  prompts: RFIPromptField[];
}

export const UNIT_OPTIONS = ['in', 'ft', 'mm', 'cm', 'm'];

export const RFI_QUESTION_TEMPLATES: RFIQuestionTemplate[] = [
  // Dimensions
  {
    id: 'dim_height',
    category: 'dimensions',
    label: 'What is the required height?',
    subjectSuffix: 'Required Height',
    prompts: [
      { key: 'height', label: 'Height', type: 'input', placeholder: 'e.g. 96', unit: true },
    ],
  },
  {
    id: 'dim_width',
    category: 'dimensions',
    label: 'What is the required width?',
    subjectSuffix: 'Required Width',
    prompts: [
      { key: 'width', label: 'Width', type: 'input', placeholder: 'e.g. 48', unit: true },
    ],
  },
  {
    id: 'dim_overall',
    category: 'dimensions',
    label: 'What are the overall dimensions?',
    subjectSuffix: 'Overall Dimensions',
    prompts: [
      { key: 'length', label: 'Length', type: 'input', placeholder: 'e.g. 12', unit: true },
      { key: 'width', label: 'Width', type: 'input', placeholder: 'e.g. 10', unit: true },
      { key: 'height', label: 'Height', type: 'input', placeholder: 'e.g. 8', unit: true },
    ],
  },
  {
    id: 'dim_oc_spacing',
    category: 'dimensions',
    label: 'What is the on-center spacing?',
    subjectSuffix: 'On-Center Spacing',
    prompts: [
      { key: 'spacing', label: 'Spacing', type: 'input', placeholder: 'e.g. 16', unit: true },
    ],
  },
  {
    id: 'dim_rough_opening',
    category: 'dimensions',
    label: 'What is the rough opening size?',
    subjectSuffix: 'Rough Opening Size',
    prompts: [
      { key: 'width', label: 'Width', type: 'input', placeholder: 'e.g. 36', unit: true },
      { key: 'height', label: 'Height', type: 'input', placeholder: 'e.g. 80', unit: true },
    ],
  },

  // Product / Material
  {
    id: 'prod_what_product',
    category: 'product_material',
    label: 'What product should be used?',
    subjectSuffix: 'Product Specification',
    prompts: [
      { key: 'product', label: 'Product Name', type: 'input', placeholder: 'e.g. Simpson Strong-Tie' },
      { key: 'brand', label: 'Brand', type: 'input', placeholder: 'e.g. Simpson' },
      { key: 'model', label: 'Model #', type: 'input', placeholder: 'e.g. HDU2' },
    ],
  },
  {
    id: 'prod_lumber',
    category: 'product_material',
    label: 'What size/grade of lumber?',
    subjectSuffix: 'Lumber Specification',
    prompts: [
      { key: 'size', label: 'Size', type: 'select', options: ['2x4', '2x6', '2x8', '2x10', '2x12', '4x4', '4x6', '6x6', 'LVL 1-3/4"', 'LVL 3-1/2"', 'Other'] },
      { key: 'grade', label: 'Grade', type: 'select', options: ['#1', '#2', '#3', 'Select Structural', 'Stud', 'PT (Pressure Treated)', 'Other'] },
      { key: 'species', label: 'Species (optional)', type: 'input', placeholder: 'e.g. Douglas Fir' },
    ],
  },
  {
    id: 'prod_fastener',
    category: 'product_material',
    label: 'What type of fastener/hardware?',
    subjectSuffix: 'Fastener Specification',
    prompts: [
      { key: 'type', label: 'Type', type: 'input', placeholder: 'e.g. lag bolt, joist hanger' },
      { key: 'size', label: 'Size', type: 'input', placeholder: 'e.g. 3/8" x 4"' },
      { key: 'finish', label: 'Finish', type: 'input', placeholder: 'e.g. galvanized, stainless' },
    ],
  },
  {
    id: 'prod_finish',
    category: 'product_material',
    label: 'What finish or color is specified?',
    subjectSuffix: 'Finish Specification',
    prompts: [
      { key: 'finish_color', label: 'Finish / Color', type: 'input', placeholder: 'e.g. SW7006 Extra White' },
    ],
  },
  {
    id: 'prod_thickness',
    category: 'product_material',
    label: 'What material thickness is required?',
    subjectSuffix: 'Material Thickness',
    prompts: [
      { key: 'thickness', label: 'Thickness', type: 'input', placeholder: 'e.g. 5/8', unit: true },
    ],
  },

  // Design Clarification
  {
    id: 'design_per_plans',
    category: 'design_clarification',
    label: 'Is this detail per the plans?',
    subjectSuffix: 'Plan Clarification',
    prompts: [
      { key: 'drawing_ref', label: 'Drawing Reference', type: 'input', placeholder: 'e.g. A3.2, Detail 4' },
      { key: 'conflict', label: 'Describe the Conflict', type: 'textarea', placeholder: 'Describe what you see vs. what you expected...' },
    ],
  },
  {
    id: 'design_which_drawing',
    category: 'design_clarification',
    label: 'Which drawing/detail governs?',
    subjectSuffix: 'Governing Drawing',
    prompts: [
      { key: 'drawing_a', label: 'Drawing A', type: 'input', placeholder: 'e.g. A2.1' },
      { key: 'drawing_b', label: 'Drawing B', type: 'input', placeholder: 'e.g. S3.2' },
      { key: 'notes', label: 'Additional Notes', type: 'textarea', placeholder: 'What differs between the two?' },
    ],
  },
  {
    id: 'design_blocking',
    category: 'design_clarification',
    label: 'Is blocking/backing required here?',
    subjectSuffix: 'Blocking Requirement',
    prompts: [
      { key: 'location_desc', label: 'Location Description', type: 'textarea', placeholder: 'Describe where blocking may be needed...' },
    ],
  },
  {
    id: 'design_fire_rating',
    category: 'design_clarification',
    label: 'What is the specified fire rating?',
    subjectSuffix: 'Fire Rating',
    prompts: [
      { key: 'assembly', label: 'Assembly Description', type: 'textarea', placeholder: 'Describe the wall/floor assembly in question...' },
    ],
  },

  // Structural
  {
    id: 'struct_bearing',
    category: 'structural',
    label: 'What is the required bearing point?',
    subjectSuffix: 'Bearing Point',
    prompts: [
      { key: 'location', label: 'Location', type: 'input', placeholder: 'e.g. Grid B-4' },
      { key: 'load_desc', label: 'Load Description', type: 'textarea', placeholder: 'Describe the load condition...' },
    ],
  },
  {
    id: 'struct_beam',
    category: 'structural',
    label: 'Is a beam/header required?',
    subjectSuffix: 'Beam / Header Requirement',
    prompts: [
      { key: 'span', label: 'Span', type: 'input', placeholder: 'e.g. 12 ft', unit: true },
      { key: 'location', label: 'Location', type: 'input', placeholder: 'e.g. above garage door' },
    ],
  },
  {
    id: 'struct_joist',
    category: 'structural',
    label: 'What is the joist/rafter size and spacing?',
    subjectSuffix: 'Joist / Rafter Specification',
    prompts: [
      { key: 'size', label: 'Size', type: 'select', options: ['2x6', '2x8', '2x10', '2x12', 'TJI 210', 'TJI 230', 'TJI 360', 'Other'] },
      { key: 'spacing', label: 'Spacing (O.C.)', type: 'input', placeholder: 'e.g. 16', unit: true },
    ],
  },
  {
    id: 'struct_connector',
    category: 'structural',
    label: 'Is a post base or connector required?',
    subjectSuffix: 'Post Base / Connector',
    prompts: [
      { key: 'location', label: 'Location', type: 'input', placeholder: 'e.g. front porch post' },
      { key: 'load', label: 'Load Description', type: 'textarea', placeholder: 'Describe the load on this connector...' },
    ],
  },

  // MEP Coordination
  {
    id: 'mep_penetration',
    category: 'mep_coordination',
    label: 'Can we penetrate this member?',
    subjectSuffix: 'Member Penetration',
    prompts: [
      { key: 'member', label: 'Member Description', type: 'input', placeholder: 'e.g. 2x10 floor joist' },
      { key: 'hole_size', label: 'Hole Size', type: 'input', placeholder: 'e.g. 3" diameter', unit: true },
    ],
  },
  {
    id: 'mep_rough_in',
    category: 'mep_coordination',
    label: 'Where should the rough-in be located?',
    subjectSuffix: 'Rough-In Location',
    prompts: [
      { key: 'fixture', label: 'Fixture Type', type: 'input', placeholder: 'e.g. bathroom sink, range hood' },
      { key: 'area', label: 'Area', type: 'input', placeholder: 'e.g. Master Bath east wall' },
    ],
  },
  {
    id: 'mep_firestop',
    category: 'mep_coordination',
    label: 'Is fire-stopping required at this penetration?',
    subjectSuffix: 'Fire-Stopping Requirement',
    prompts: [
      { key: 'location', label: 'Penetration Location', type: 'textarea', placeholder: 'Describe the penetration location...' },
    ],
  },

  // General
  {
    id: 'general_freeform',
    category: 'general',
    label: 'Free-form question',
    subjectSuffix: 'General Question',
    prompts: [
      { key: 'subject_custom', label: 'Subject', type: 'input', placeholder: 'Brief title for the question' },
      { key: 'question_custom', label: 'Question', type: 'textarea', placeholder: 'Describe the information you need...' },
    ],
  },
];

export interface RFIWizardData {
  // Step 1: Location
  location_data: LocationData & {
    custom_room_area?: string;
    exterior_feature?: string;
    custom_exterior?: string;
  };
  // Step 2: Category + Template
  category: RFICategory | null;
  templateId: string | null;
  // Step 3: Template answers
  answers: Record<string, string>;
  answerUnits: Record<string, string>; // unit per field key
  // Step 4: Routing
  assignedToOrgId: string;
  priority: RFIPriority;
  dueDate: Date | undefined;
  // Step 5: Review (editable)
  subject: string;
  question: string;
}

export const INITIAL_RFI_WIZARD_DATA: RFIWizardData = {
  location_data: {},
  category: null,
  templateId: null,
  answers: {},
  answerUnits: {},
  assignedToOrgId: '',
  priority: 'MEDIUM',
  dueDate: undefined,
  subject: '',
  question: '',
};

export interface ProjectRFI {
  id: string;
  project_id: string;
  rfi_number: number;
  subject: string;
  question: string;
  answer: string | null;
  status: RFIStatus;
  priority: RFIPriority;
  submitted_by_org_id: string;
  submitted_by_user_id: string;
  assigned_to_org_id: string;
  answered_by_user_id: string | null;
  answered_at: string | null;
  due_date: string | null;
  reference_area: string | null;
  location_data: Record<string, string> | null;
  created_at: string;
  updated_at: string;
  submitted_by_org?: { name: string } | null;
  assigned_to_org?: { name: string } | null;
}

export interface CreateRFIPayload {
  project_id: string;
  subject: string;
  question: string;
  priority: RFIPriority;
  submitted_by_org_id: string;
  submitted_by_user_id: string;
  assigned_to_org_id: string;
  due_date?: string | null;
  reference_area?: string | null;
  location_data?: Record<string, string> | null;
}
