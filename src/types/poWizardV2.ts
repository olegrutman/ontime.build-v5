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
};

// Map database categories to display names and icons
export const CATEGORY_DISPLAY: Record<string, { name: string; icon: string }> = {
  Hardware: { name: 'HARDWARE', icon: '🔩' },
  Dimensional: { name: 'FRAMING LUMBER', icon: '🪵' },
  Decking: { name: 'DECKING', icon: '🏠' },
  Engineered: { name: 'ENGINEERED WOOD', icon: '📐' },
  Sheathing: { name: 'SHEATHING', icon: '📦' },
  Other: { name: 'OTHER', icon: '📋' },
  Exterior: { name: 'EXTERIOR TRIM', icon: '🪟' },
  Structural: { name: 'STRUCTURAL STEEL', icon: '🔧' },
};

// Field labels for display
export const FIELD_LABELS: Record<string, string> = {
  dimension: 'Dimension',
  length: 'Length',
  color: 'Color',
  wood_species: 'Wood Species',
  thickness: 'Thickness',
  finish: 'Finish',
  manufacturer: 'Manufacturer',
};

// Spec filter priority by category - supports secondary-specific sequences
export const SPEC_PRIORITY: Record<string, string[] | Record<string, string[]>> = {
  // Decking products
  Decking: ['dimension', 'color', 'length', 'manufacturer'],
  
  // Lumber - dimension-based
  Dimensional: ['dimension', 'length', 'wood_species'],
  
  // Other category - depends heavily on secondary
  Other: {
    default: ['dimension', 'length'],
    STUDS: ['dimension', 'length', 'wood_species'],
    DIMENSION: ['dimension', 'length', 'wood_species'],
    OSB: ['thickness', 'dimension'],
    CDX: ['thickness', 'dimension'],
    'INTERIOR DRYWALL': ['thickness', 'dimension'],
    'EXTERIOR DRYWALL': ['thickness', 'dimension'],
    SIDING: ['dimension', 'manufacturer'],
    TREATED: ['dimension', 'length'],
  },
  
  // Engineered wood
  Engineered: ['dimension', 'length'],
  
  // Hardware - skip directly to products (no specs to filter)
  Hardware: [],
  
  // Exterior trim
  Exterior: ['dimension', 'finish', 'manufacturer'],
  
  // Sheathing
  Sheathing: ['thickness', 'dimension'],
  
  // Structural steel - skip to products
  Structural: [],
};

// Helper function to get filter sequence based on category and secondary
export function getFilterSequence(category: string, secondary: string | null): string[] {
  const categoryPriority = SPEC_PRIORITY[category];
  
  // Handle categories with secondary-specific priorities (like "Other")
  if (categoryPriority && typeof categoryPriority === 'object' && !Array.isArray(categoryPriority)) {
    if (secondary && categoryPriority[secondary]) {
      return categoryPriority[secondary];
    }
    return categoryPriority.default || [];
  }
  
  return Array.isArray(categoryPriority) ? categoryPriority : [];
}
