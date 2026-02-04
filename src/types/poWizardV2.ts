// Re-export category definitions from the extracted module
export {
  VIRTUAL_CATEGORIES,
  SECONDARY_DISPLAY_NAMES,
  SPEC_PRIORITY,
  FIELD_LABELS,
  CATEGORY_DISPLAY,
  getFilterSequence,
  EXCEL_TO_DB_CATEGORY,
} from './catalogCategories';

export type { VirtualCategory } from './catalogCategories';

export interface POWizardV2Data {
  // Header (Screen 1)
  project_id: string;
  project_name: string;
  delivery_address: string;
  supplier_id: string | null;
  supplier_name?: string;
  requested_delivery_date: Date | null;
  delivery_window: 'AM' | 'PM' | 'ANY';
  notes: string;

  // Items (Screen 2)
  line_items: POWizardV2LineItem[];

  // Work Order context (optional)
  work_order_id?: string;
  work_order_title?: string;
}

export interface POWizardV2LineItem {
  id: string; // Client-side ID for editing
  catalog_item_id: string;
  supplier_sku: string;
  name: string;
  specs: string; // "1x6 | 12ft | Cedar"
  quantity: number;
  unit_mode: 'EACH' | 'BUNDLE';
  bundle_count?: number;
  bundle_name?: string;
  item_notes?: string;
  uom: string;

  // For engineered lumber (LVL, LSL, I-Joists, Glulam, Rim Board)
  length_ft?: number; // Length per piece in feet
  computed_lf?: number; // Total linear feet (quantity * length_ft)
  is_engineered?: boolean; // Flag for display purposes
}

export interface ProjectSupplier {
  id: string;
  name: string;
  supplier_code: string;
  organization_id: string;
}

export interface CatalogProduct {
  id: string;
  supplier_sku: string;
  description: string;
  name: string | null;
  category: string;
  secondary_category: string | null;
  dimension: string | null;
  length: string | null;
  color: string | null;
  wood_species: string | null;
  thickness: string | null;
  finish: string | null;
  manufacturer: string | null;
  bundle_type: string | null;
  bundle_qty: number | null;
  uom_default: string;
  use_type?: string | null;
  product_type?: string | null;
}

export interface CategoryCount {
  category: string;
  count: number;
  displayName: string;
  icon: string;
}

export interface SecondaryCount {
  secondary_category: string;
  count: number;
}

export interface SpecValue {
  value: string;
  count: number;
}

export const INITIAL_PO_WIZARD_V2_DATA: POWizardV2Data = {
  project_id: '',
  project_name: '',
  delivery_address: '',
  supplier_id: null,
  supplier_name: undefined,
  requested_delivery_date: null,
  delivery_window: 'ANY',
  notes: '',
  line_items: [],
  work_order_id: undefined,
  work_order_title: undefined,
};
