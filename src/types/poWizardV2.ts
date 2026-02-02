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
  
  // For engineered lumber (LVL, LSL, I-Joists, Glulam, Rim Board)
  length_ft?: number;         // Length per piece in feet
  computed_lf?: number;       // Total linear feet (quantity * length_ft)
  is_engineered?: boolean;    // Flag for display purposes
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

// Virtual categories that map to multiple secondary_categories
export interface VirtualCategory {
  displayName: string;
  icon: string;
  dbCategory: string; // The actual database category
  secondaryCategories: string[]; // Which secondary_categories to include
}

export const VIRTUAL_CATEGORIES: Record<string, VirtualCategory> = {
  LUMBER: {
    displayName: 'LUMBER',
    icon: '🪵',
    dbCategory: 'Other',
    secondaryCategories: ['STUDS', 'DIMENSION', 'TREATED', 'WIDES'],
  },
  SIDING: {
    displayName: 'SIDING & EXTERIOR',
    icon: '🏠',
    dbCategory: 'Other',
    secondaryCategories: ['SIDING', 'SIDING ACCESSORIES', 'TRIM', 'SOFFIT'],
  },
  HOUSE_WRAP: {
    displayName: 'HOUSE WRAP & TAPE',
    icon: '🧻',
    dbCategory: 'Other',
    secondaryCategories: ['MOISTURE CONTROL'],
  },
  POST_TIMBER: {
    displayName: 'POST & TIMBER',
    icon: '🌲',
    dbCategory: 'Other',
    secondaryCategories: ['POST/TIMBER', 'COLUMN'],
  },
  SHEATHING: {
    displayName: 'SHEATHING',
    icon: '📦',
    dbCategory: 'Other',
    secondaryCategories: ['OSB', 'CDX', 'ZIP', 'T&G'],
  },
  HARDWARE: {
    displayName: 'HARDWARE',
    icon: '🔩',
    dbCategory: 'Hardware',
    secondaryCategories: [], // All hardware
  },
  ENGINEERED: {
    displayName: 'ENGINEERED',
    icon: '📐',
    dbCategory: 'Engineered',
    secondaryCategories: [], // All engineered
  },
  DECKING: {
    displayName: 'DECKING',
    icon: '🏡',
    dbCategory: 'Decking',
    secondaryCategories: [], // All decking
  },
};

// Friendly display names for secondary categories
export const SECONDARY_DISPLAY_NAMES: Record<string, string> = {
  // Lumber
  STUDS: 'Studs',
  DIMENSION: 'Dimension Lumber',
  TREATED: 'Treated Lumber',
  WIDES: 'Wide Boards',
  
  // Siding
  SIDING: 'Lap Siding & Panels',
  'SIDING ACCESSORIES': 'Siding Accessories',
  TRIM: 'Exterior Trim',
  SOFFIT: 'Soffit',
  
  // House Wrap
  'MOISTURE CONTROL': 'House Wrap & Seam Tape',
  
  // Post/Timber
  'POST/TIMBER': 'Posts & Timbers',
  COLUMN: 'Columns',
  
  // Sheathing
  OSB: 'OSB Sheathing',
  CDX: 'CDX Plywood',
  ZIP: 'ZIP System',
  'T&G': 'Tongue & Groove',
  
  // Engineered
  LVL: 'LVL Headers & Beams',
  LSL: 'LSL Framing',
  'I JOISTS': 'I-Joists',
  GLUELAM: 'Glulam Beams',
  'RIM BOARD': 'Rim Board',
  
  // Hardware
  HANGER: 'Joist Hangers',
  'TIE & STRAP': 'Ties & Straps',
  ANCHORS: 'Anchors',
  'POST HARDWARE': 'Post Hardware',
  
  // Decking
  'DECK BOARDS': 'Deck Boards',
  ACCESSORIES: 'Accessories',
  'POST CAP': 'Post Caps',
};

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

// Map database categories to display names and icons (legacy - use VIRTUAL_CATEGORIES)
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
  wood_species: 'Species',
  thickness: 'Thickness',
  finish: 'Finish',
  manufacturer: 'Manufacturer',
};

// Spec filter priority by category - supports secondary-specific sequences
export const SPEC_PRIORITY: Record<string, string[] | Record<string, string[]>> = {
  // Decking products
  Decking: ['dimension', 'color', 'length', 'manufacturer'],
  
  // Lumber - dimension-based (legacy)
  Dimensional: ['dimension', 'length', 'wood_species'],
  
  // Other category - depends heavily on secondary
  Other: {
    default: ['dimension', 'length'],
    STUDS: ['dimension', 'length'],
    DIMENSION: ['dimension', 'length'],
    TREATED: ['dimension', 'length'],
    WIDES: ['dimension', 'length'],
    'POST/TIMBER': ['wood_species', 'dimension', 'length'], // Species FIRST
    COLUMN: ['wood_species', 'dimension', 'length'],
    SIDING: ['manufacturer', 'dimension'],
    'SIDING ACCESSORIES': ['manufacturer'],
    TRIM: ['dimension', 'length'],
    SOFFIT: ['dimension'],
    'MOISTURE CONTROL': ['manufacturer', 'dimension'], // Tyvek/Dow/Barricade
    OSB: ['thickness', 'dimension'],
    CDX: ['thickness', 'dimension'],
    ZIP: ['thickness', 'dimension'],
    'T&G': ['thickness', 'dimension'],
  },
  
  // Engineered wood
  Engineered: {
    default: ['dimension'],
    LVL: ['dimension'],
    LSL: ['dimension'],
    'I JOISTS': ['dimension'],
    GLUELAM: ['dimension'],
    'RIM BOARD': ['dimension'],
  },
  
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
