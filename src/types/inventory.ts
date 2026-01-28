import { CatalogCategory } from './supplier';

export interface InventoryItem {
  id: string;
  supplier_id: string;
  supplier_sku: string;
  category: CatalogCategory;
  description: string;
  uom_default: string;
  size_or_spec?: string;
  search_keywords?: string[];
  rank?: number;
}

export interface InventoryFilters {
  search: string;
  mainCategory: CatalogCategory | null;
  secondaryCategory: string | null;
  attributes: string[];
  qtyType: string | null;
}

export interface FilterHistory {
  type: 'mainCategory' | 'secondaryCategory' | 'attribute' | 'qtyType';
  value: string;
}

export interface InventoryPreset {
  id: string;
  label: string;
  icon?: string;
  filters: Partial<InventoryFilters>;
}

// Common presets for quick access
export const INVENTORY_PRESETS: InventoryPreset[] = [
  { id: 'lumber', label: 'Lumber', filters: { mainCategory: 'Dimensional' } },
  { id: 'engineered', label: 'Engineered', filters: { mainCategory: 'Engineered' } },
  { id: 'sheathing', label: 'Sheathing', filters: { mainCategory: 'Sheathing' } },
  { id: 'hardware', label: 'Hardware', filters: { mainCategory: 'Hardware' } },
  { id: 'fasteners', label: 'Fasteners', filters: { mainCategory: 'Fasteners' } },
];

// Secondary categories map (main → secondaries)
export const SECONDARY_CATEGORIES: Record<string, string[]> = {
  Dimensional: ['Studs', 'Joists', 'Beams', 'Posts', 'Boards'],
  Engineered: ['LVL', 'I-Joists', 'Glulam', 'PSL', 'LSL'],
  Sheathing: ['OSB', 'Plywood', 'CDX', 'Radiant Barrier'],
  Hardware: ['Connectors', 'Hangers', 'Straps', 'Anchors', 'Brackets'],
  Fasteners: ['Nails', 'Screws', 'Bolts', 'Staples'],
  Decking: ['Composite', 'Pressure Treated', 'Cedar', 'Hardwood'],
  Roofing: ['Shingles', 'Underlayment', 'Flashing', 'Vents'],
  Insulation: ['Batt', 'Blown', 'Rigid', 'Spray Foam'],
  Exterior: ['Siding', 'Trim', 'Soffit', 'Fascia'],
  Interior: ['Drywall', 'Trim', 'Moulding', 'Doors'],
};

// Common attribute values for chips (extracted from attributes_json)
export const COMMON_LENGTHS = ['8 ft', '10 ft', '12 ft', '14 ft', '16 ft', '18 ft', '20 ft'];
export const COMMON_SIZES = ['2x4', '2x6', '2x8', '2x10', '2x12', '4x4', '4x6', '6x6'];
export const COMMON_QTY_TYPES = ['EA', 'LF', 'SF', 'BF', 'PC'];
