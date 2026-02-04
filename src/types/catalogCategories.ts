// Category definitions for the product picker - extracted from poWizardV2.ts for maintainability

export interface VirtualCategory {
  displayName: string;
  icon: string;
  dbCategory: string; // The actual database category enum value
  secondaryCategories: string[]; // Which secondary_categories to include
}

// Virtual categories that map to multiple secondary_categories
// These represent the main categories shown in the product picker grid
export const VIRTUAL_CATEGORIES: Record<string, VirtualCategory> = {
  FRAMING_LUMBER: {
    displayName: 'FRAMING LUMBER',
    icon: '🪵',
    dbCategory: 'Dimensional',
    secondaryCategories: ['DIMENSION', 'STUDS', 'WIDES', 'POST/TIMBER', 'TREATED', 'THIN BOARDS'],
  },
  EXTERIOR_TRIM: {
    displayName: 'EXTERIOR TRIM',
    icon: '🏠',
    dbCategory: 'Exterior',
    secondaryCategories: ['SIDING', 'SOFFIT', 'TRIM', 'SIDING ACCESSORIES', 'METAL FLASHING', 'MOISTURE CONTROL'],
  },
  DECKING: {
    displayName: 'DECKING',
    icon: '🏡',
    dbCategory: 'Decking',
    secondaryCategories: ['DECK BOARDS', 'ACCESSORIES', 'POST CAP'],
  },
  HARDWARE: {
    displayName: 'HARDWARE',
    icon: '🔩',
    dbCategory: 'Hardware',
    secondaryCategories: ['HANGER', 'ANGLE', 'ANCHORS', 'POST HARDWARE', 'TIE & STRAP', 'PLATES CONNECTORS AND CLIPS', 'OTHER'],
  },
  SHEATHING: {
    displayName: 'SHEATHING & PLYWOOD',
    icon: '📦',
    dbCategory: 'Sheathing',
    secondaryCategories: ['OSB', 'CDX', 'ZIP', 'T&G', 'FIRE TREATED', 'HARDBOARD', 'SPECIALTY', 'CLIPS'],
  },
  ENGINEERED: {
    displayName: 'ENGINEERED',
    icon: '📐',
    dbCategory: 'Engineered',
    secondaryCategories: ['LVL', 'I JOISTS', 'RIM BOARD', 'GLUELAM'],
  },
  STRUCTURAL_STEEL: {
    displayName: 'STRUCTURAL STEEL',
    icon: '🔧',
    dbCategory: 'Structural',
    secondaryCategories: ['COLUMN', 'I-BEAM', 'STEEL ANGLE'],
  },
  FRAMING_ACCESSORIES: {
    displayName: 'FRAMING ACCESSORIES',
    icon: '🔗',
    dbCategory: 'Fasteners',
    secondaryCategories: ['FASTENERS'],
  },
};

// Friendly display names for secondary categories
export const SECONDARY_DISPLAY_NAMES: Record<string, string> = {
  // Framing Lumber
  DIMENSION: 'Dimension Lumber',
  STUDS: 'Wall Studs',
  WIDES: 'Wide Boards (2x8+)',
  'POST/TIMBER': 'Posts & Timbers',
  TREATED: 'Pressure Treated',
  'THIN BOARDS': 'Thin Boards (1x)',

  // Exterior Trim
  SIDING: 'Lap Siding & Panels',
  SOFFIT: 'Soffit',
  TRIM: 'Trim Boards',
  'SIDING ACCESSORIES': 'Corners & Accessories',
  'METAL FLASHING': 'Metal Flashing',
  'MOISTURE CONTROL': 'House Wrap & Tape',

  // Decking
  'DECK BOARDS': 'Deck Boards',
  ACCESSORIES: 'Deck Accessories',
  'POST CAP': 'Post Caps',

  // Hardware
  HANGER: 'Joist Hangers',
  ANGLE: 'Angles & Brackets',
  ANCHORS: 'Anchors',
  'POST HARDWARE': 'Post Hardware',
  'TIE & STRAP': 'Ties & Straps',
  'PLATES CONNECTORS AND CLIPS': 'Plates & Connectors',
  OTHER: 'Other Hardware',

  // Sheathing
  OSB: 'OSB',
  CDX: 'CDX Plywood',
  ZIP: 'ZIP System',
  'T&G': 'Tongue & Groove',
  'FIRE TREATED': 'Fire Treated',
  HARDBOARD: 'Hardboard',
  SPECIALTY: 'Specialty Panels',
  CLIPS: 'Plywood Clips',

  // Engineered
  LVL: 'LVL Beams',
  'I JOISTS': 'I-Joists',
  'RIM BOARD': 'Rim Board',
  GLUELAM: 'Glulam Beams',

  // Structural Steel
  COLUMN: 'Steel Columns',
  'I-BEAM': 'I-Beams',
  'STEEL ANGLE': 'Steel Angles',

  // Framing Accessories
  FASTENERS: 'Fasteners & Screws',
};

// Spec filter priority by category - supports secondary-specific sequences
// Defines which specs to filter on and in what order for each category/secondary combo
export const SPEC_PRIORITY: Record<string, string[] | Record<string, string[]>> = {
  // Framing Lumber - dimension and length based
  Dimensional: {
    default: ['dimension', 'length', 'wood_species'],
    DIMENSION: ['dimension', 'length', 'wood_species'],
    STUDS: ['dimension', 'length'],
    WIDES: ['dimension', 'length', 'wood_species'],
    'POST/TIMBER': ['dimension', 'length'],
    TREATED: ['dimension', 'length', 'color'],
    'THIN BOARDS': ['dimension', 'length', 'wood_species'],
  },

  // Exterior Trim - manufacturer and type based
  Exterior: {
    default: ['manufacturer', 'product_type', 'dimension'],
    SIDING: ['manufacturer', 'product_type', 'dimension', 'finish'],
    SOFFIT: ['manufacturer', 'product_type', 'dimension'],
    TRIM: ['dimension', 'length', 'finish'],
    'SIDING ACCESSORIES': ['manufacturer'],
    'METAL FLASHING': ['product_type', 'dimension'],
    'MOISTURE CONTROL': ['manufacturer'],
  },

  // Decking - color and dimension based
  Decking: ['dimension', 'color', 'length', 'manufacturer'],

  // Hardware - no spec filters, go straight to product list
  Hardware: {
    default: [],
    HANGER: [],
    ANGLE: [],
    ANCHORS: [],
    'POST HARDWARE': [],
    'TIE & STRAP': [],
    'PLATES CONNECTORS AND CLIPS': [],
    OTHER: [],
  },

  // Sheathing - thickness based
  Sheathing: ['thickness', 'dimension'],

  // Engineered - dimension based
  Engineered: ['dimension'],

  // Structural Steel - dimension based
  Structural: {
    default: ['dimension'],
    COLUMN: ['dimension'],
    'I-BEAM': ['dimension'],
    'STEEL ANGLE': ['dimension', 'thickness'],
  },

  // Framing Accessories - no spec filters
  Fasteners: [],
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
  product_type: 'Type',
};

// Map database categories to display names and icons (for fallback)
export const CATEGORY_DISPLAY: Record<string, { name: string; icon: string }> = {
  Hardware: { name: 'HARDWARE', icon: '🔩' },
  Dimensional: { name: 'FRAMING LUMBER', icon: '🪵' },
  Decking: { name: 'DECKING', icon: '🏡' },
  Engineered: { name: 'ENGINEERED WOOD', icon: '📐' },
  Sheathing: { name: 'SHEATHING', icon: '📦' },
  Other: { name: 'OTHER', icon: '📋' },
  Exterior: { name: 'EXTERIOR TRIM', icon: '🏠' },
  Structural: { name: 'STRUCTURAL STEEL', icon: '🔧' },
  Fasteners: { name: 'FRAMING ACCESSORIES', icon: '🔗' },
};

// Helper function to get filter sequence based on category and secondary
export function getFilterSequence(category: string, secondary: string | null): string[] {
  const categoryPriority = SPEC_PRIORITY[category];

  // Handle categories with secondary-specific priorities (like Dimensional, Exterior)
  if (categoryPriority && typeof categoryPriority === 'object' && !Array.isArray(categoryPriority)) {
    if (secondary && categoryPriority[secondary]) {
      return categoryPriority[secondary];
    }
    return categoryPriority.default || [];
  }

  return Array.isArray(categoryPriority) ? categoryPriority : [];
}

// Category mapping from Excel file values to database enum values
export const EXCEL_TO_DB_CATEGORY: Record<string, string> = {
  'DECKING': 'Decking',
  'EXTERIOR TRIM': 'Exterior',
  'FRAMING ACCESSORIES': 'Fasteners',
  'FRAMING LUMBER': 'Dimensional',
  'HARDWARE': 'Hardware',
  'SHEATING AND PLYWOOD': 'Sheathing',
  'STRUCTURAL STEEL': 'Structural',
  'ENGINEERED': 'Engineered',
};
