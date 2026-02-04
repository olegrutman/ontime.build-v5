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
  FRAMING_LUMBER: {
    displayName: 'FRAMING LUMBER',
    icon: '🪵',
    dbCategory: 'FramingLumber',
    secondaryCategories: ['STUDS', 'DIMENSION', 'WIDES', 'POST/TIMBER', 'TREATED', 'THIN BOARDS'],
  },
  HARDWARE: {
    displayName: 'HARDWARE',
    icon: '🔩',
    dbCategory: 'Hardware',
    secondaryCategories: [], // All hardware secondaries
  },
  ENGINEERED: {
    displayName: 'ENGINEERED WOOD',
    icon: '📐',
    dbCategory: 'Engineered',
    secondaryCategories: ['LVL', 'LSL', 'I JOISTS', 'GLUELAM', 'RIM BOARD'],
  },
  SHEATHING: {
    displayName: 'SHEATHING & PLYWOOD',
    icon: '📦',
    dbCategory: 'Sheathing',
    secondaryCategories: ['OSB', 'CDX', 'ZIP', 'T&G', 'FIRE TREATED', 'HARDBOARD', 'SPECIALTY', 'CLIPS'],
  },
  EXTERIOR: {
    displayName: 'EXTERIOR TRIM',
    icon: '🏠',
    dbCategory: 'Exterior',
    secondaryCategories: ['SIDING', 'CORNER TRIM', 'STARTER STRIPS', 'WINDOW/DOOR TRIM'],
  },
  DECKING: {
    displayName: 'DECKING',
    icon: '🏡',
    dbCategory: 'Decking',
    secondaryCategories: ['DECK BOARDS', 'ACCESSORIES', 'POST CAP', 'POST SKIRT'],
  },
  FRAMING_ACCESSORIES: {
    displayName: 'FRAMING ACCESSORIES',
    icon: '🔧',
    dbCategory: 'FramingAccessories',
    secondaryCategories: ['FASTENERS', 'ADHESIVES', 'MOISTURE CONTROL', 'NAILS'],
  },
  DRYWALL: {
    displayName: 'DRYWALL',
    icon: '📋',
    dbCategory: 'Drywall',
    secondaryCategories: ['EXTERIOR DRYWALL', 'INTERIOR DRYWALL', 'SHAFTWALL', 'SHAFTWALL HARDWARE', 'ACCESSORIES'],
  },
  STRUCTURAL: {
    displayName: 'STRUCTURAL STEEL',
    icon: '🏗️',
    dbCategory: 'Structural',
    secondaryCategories: ['COLUMN', 'I-BEAM', 'STEEL ANGLE'],
  },
};

// Friendly display names for secondary categories
export const SECONDARY_DISPLAY_NAMES: Record<string, string> = {
  // Framing Lumber
  STUDS: 'Studs',
  DIMENSION: 'Dimension Lumber',
  WIDES: 'Wide Boards',
  'POST/TIMBER': 'Posts & Timbers',
  TREATED: 'Treated Lumber',
  'THIN BOARDS': 'Thin Boards (1x)',
  
  // Hardware
  HANGER: 'Joist Hangers',
  'TIE & STRAP': 'Ties & Straps',
  ANCHORS: 'Anchors',
  'POST HARDWARE': 'Post Hardware',
  'COLUMN HARDWARE': 'Column Hardware',
  'HOLD DOWN': 'Hold Downs',
  ANGLE: 'Angles',
  'PLATES CONNECTORS AND CLIPS': 'Plates & Connectors',
  
  // Engineered
  LVL: 'LVL Headers & Beams',
  LSL: 'LSL Framing',
  'I JOISTS': 'I-Joists',
  GLUELAM: 'Glulam Beams',
  'RIM BOARD': 'Rim Board',
  
  // Sheathing
  OSB: 'OSB Sheathing',
  CDX: 'CDX Plywood',
  ZIP: 'ZIP System',
  'T&G': 'Tongue & Groove',
  'FIRE TREATED': 'Fire Treated',
  HARDBOARD: 'Hardboard',
  SPECIALTY: 'Specialty',
  CLIPS: 'Sheathing Clips',
  
  // Exterior Trim
  SIDING: 'Siding',
  'CORNER TRIM': 'Corner Trim',
  'STARTER STRIPS': 'Starter Strips',
  'WINDOW/DOOR TRIM': 'Window/Door Trim',
  
  // Decking
  'DECK BOARDS': 'Deck Boards',
  ACCESSORIES: 'Accessories',
  'POST CAP': 'Post Caps',
  'POST SKIRT': 'Post Skirts',
  
  // Framing Accessories
  FASTENERS: 'Fasteners',
  ADHESIVES: 'Adhesives',
  'MOISTURE CONTROL': 'Moisture Control',
  NAILS: 'Nails',
  
  // Drywall
  'EXTERIOR DRYWALL': 'Exterior Drywall',
  'INTERIOR DRYWALL': 'Interior Drywall',
  SHAFTWALL: 'Shaftwall',
  'SHAFTWALL HARDWARE': 'Shaftwall Hardware',
  
  // Structural Steel
  COLUMN: 'Columns',
  'I-BEAM': 'I-Beams',
  'STEEL ANGLE': 'Steel Angles',
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
  work_order_id: undefined,
  work_order_title: undefined,
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
  // Framing Lumber - dimension-based
  FramingLumber: {
    default: ['dimension', 'length'],
    STUDS: ['dimension', 'length'],
    DIMENSION: ['dimension', 'length'],
    WIDES: ['dimension', 'length'],
    TREATED: ['dimension', 'length'],
    'POST/TIMBER': ['wood_species', 'dimension', 'length'],
    'THIN BOARDS': ['dimension', 'length'],
  },
  
  // Hardware - skip filters, go directly to products
  Hardware: [],
  
  // Engineered wood
  Engineered: {
    default: ['dimension'],
    LVL: ['dimension'],
    LSL: ['dimension'],
    'I JOISTS': ['dimension'],
    GLUELAM: ['dimension'],
    'RIM BOARD': ['dimension'],
  },
  
  // Sheathing
  Sheathing: ['thickness', 'dimension'],
  
  // Exterior trim
  Exterior: ['manufacturer', 'dimension', 'color'],
  
  // Decking products
  Decking: ['dimension', 'color', 'length', 'manufacturer'],
  
  // Framing Accessories - skip filters
  FramingAccessories: [],
  
  // Drywall
  Drywall: ['thickness', 'dimension'],
  
  // Structural steel - skip filters
  Structural: [],
  
  // Other/legacy
  Other: {
    default: ['dimension', 'length'],
  },
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
