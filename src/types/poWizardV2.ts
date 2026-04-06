export interface POWizardV2Data {
  // Header (Screen 1)
  project_id: string;
  sales_tax_percent: number;
  project_name: string;
  delivery_address: string;
  supplier_id: string | null;
  supplier_name?: string;
  requested_delivery_date: Date | null;
  delivery_window: 'AM' | 'PM' | 'ANY';
  notes: string;

  // Items (Screen 2)
  line_items: POWizardV2LineItem[];

  // Change Order context (optional)
  change_order_id?: string;
  change_order_title?: string;

  // Estimate/Pack context (optional)
  source_estimate_id?: string;
  source_pack_name?: string;
  pack_modified?: boolean;
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

  // Pricing traceability
  unit_price?: number | null;
  line_total?: number | null;
  source_estimate_item_id?: string | null;
  source_pack_name?: string | null;
  price_source?: 'FROM_ESTIMATE' | 'SUPPLIER_MANUAL' | 'CATALOG_DEFAULT' | null;
  price_adjusted_by_supplier?: boolean;
  original_unit_price?: number | null;
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
    secondaryCategories: [' ANCHORS ', ' ANGLE ', ' COLUMN HARDWARE ', ' HANGER ', ' HOLD DOWN ', ' OTHER ', ' PLATES CONNECTORS AND CLIPS ', ' POST HARDWARE ', ' TIE & STRAP '],
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
    secondaryCategories: ['SIDING', 'TRIM', 'SOFFIT ', 'METAL FLASHING', 'MOISTURE CONTROL', 'SIDING ACCESSORIES'],
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
  OTHER: {
    displayName: 'OTHER LUMBER',
    icon: '📦',
    dbCategory: 'Other',
    secondaryCategories: ['DECK BOARDS'],
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
  
  // Hardware - actual database values with spaces
  ' ANCHORS ': 'Anchors',
  ' ANGLE ': 'Angles',
  ' COLUMN HARDWARE ': 'Column Hardware',
  ' HANGER ': 'Joist Hangers',
  ' HOLD DOWN ': 'Hold Downs',
  ' OTHER ': 'Other Hardware',
  ' PLATES CONNECTORS AND CLIPS ': 'Plates & Connectors',
  ' POST HARDWARE ': 'Post Hardware',
  ' TIE & STRAP ': 'Ties & Straps',
  
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
  
  // Exterior Trim - actual database values
  SIDING: 'Siding',
  TRIM: 'Trim Boards',
  'SOFFIT ': 'Soffit',
  'METAL FLASHING': 'Metal Flashing',
  'MOISTURE CONTROL': 'Moisture Control',
  'SIDING ACCESSORIES': 'Siding Accessories',
  
  // Decking
  'DECK BOARDS': 'Deck Boards',
  ACCESSORIES: 'Accessories',
  'POST CAP': 'Post Caps',
  'POST SKIRT': 'Post Skirts',
  
  // Framing Accessories
  FASTENERS: 'Fasteners',
  ADHESIVES: 'Adhesives',
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
  sales_tax_percent: 0,
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
  source_estimate_id: undefined,
  source_pack_name: undefined,
  pack_modified: false,
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

// All possible filterable fields from catalog_items
export const FILTERABLE_FIELDS = [
  'manufacturer',
  'use_type',
  'product_type',
  'wood_species',
  'dimension',
  'length',
  'color',
  'thickness',
  'finish',
  'depth',
  'width',
  'edge_type',
  'diameter',
] as const;

export type FilterableField = typeof FILTERABLE_FIELDS[number];

// Priority order for filter display (higher priority = shown first)
export const FILTER_PRIORITY: Record<string, number> = {
  manufacturer: 100,
  use_type: 90,
  product_type: 80,
  wood_species: 70,
  dimension: 60,
  length: 50,
  color: 45,
  thickness: 40,
  finish: 35,
  depth: 30,
  width: 25,
  edge_type: 20,
  diameter: 10,
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
  use_type: 'Use Type',
  product_type: 'Product Type',
  edge_type: 'Edge Type',
  depth: 'Depth',
  width: 'Width',
  diameter: 'Diameter',
};

// Spec filter priority by category - supports secondary-specific sequences
export const SPEC_PRIORITY: Record<string, string[] | Record<string, string[]>> = {
  // Framing Lumber - fully populated
  FramingLumber: {
    default: ['wood_species', 'dimension', 'length'],
    STUDS: ['dimension', 'length'],
    DIMENSION: ['dimension', 'length'],
    WIDES: ['dimension', 'length'],
    TREATED: ['dimension', 'length'],
    'POST/TIMBER': ['wood_species', 'dimension', 'length'],
    'THIN BOARDS': ['dimension', 'length'],
  },
  
  // Hardware - use thickness filter (sparse data)
  Hardware: ['thickness'],
  
  // Engineered wood - use available fields
  Engineered: {
    default: ['use_type', 'product_type', 'length'],
    LVL: ['use_type', 'product_type'],
    LSL: ['use_type', 'product_type'],
    'I JOISTS': ['use_type', 'product_type'],
    GLUELAM: ['use_type', 'product_type'],
    'RIM BOARD': ['use_type', 'product_type'],
  },
  
  // Sheathing
  Sheathing: ['thickness', 'dimension', 'product_type'],
  
  // Exterior trim - manufacturer → use_type → product_type
  Exterior: ['manufacturer', 'use_type', 'product_type'],
  
  // Decking products - fully populated
  Decking: ['manufacturer', 'dimension', 'color', 'length'],
  
  // Framing Accessories - use dimension filter (sparse data)
  FramingAccessories: ['dimension'],
  
  // Drywall
  Drywall: ['dimension', 'product_type'],
  
  // Structural steel
  Structural: ['dimension', 'product_type', 'thickness'],
  
  // Other (cedar/hemlock) - fully populated
  Other: ['wood_species', 'dimension', 'length'],
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
