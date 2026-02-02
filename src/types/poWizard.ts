export interface POWizardLineItem {
  catalog_item_id: string;
  supplier_sku: string;
  description: string;
  quantity: number;
  uom: string;
  pieces?: number;
  length_ft?: number;
}

export interface POWizardData {
  // Step 1: Supplier
  supplier_id: string | null;
  supplier_name?: string;

  // Step 2: Project/Context
  project_id: string | null;
  project_name?: string;
  work_item_id: string | null;
  work_item_title?: string;

  // Step 3: Line Items
  line_items: POWizardLineItem[];

  // Step 4: Notes
  notes: string;
}

export const INITIAL_PO_WIZARD_DATA: POWizardData = {
  supplier_id: null,
  project_id: null,
  work_item_id: null,
  line_items: [],
  notes: '',
};

export const QUICK_NOTES = [
  'Call before delivery',
  'Deliver to back gate',
  'Forklift required',
  'Leave on driveway',
  'Contact site super',
  'Morning delivery only',
];
