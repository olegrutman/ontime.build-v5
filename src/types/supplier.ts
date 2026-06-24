export type CatalogCategory = 
  | 'Decking'
  | 'Drywall'
  | 'Engineered'
  | 'Exterior'
  | 'FramingAccessories'
  | 'FramingLumber'
  | 'Hardware'
  | 'Sheathing'
  | 'Structural'
  | 'Other';

export interface Supplier {
  id: string;
  organization_id: string;
  supplier_code: string;
  name: string;
  contact_info?: string;
  created_at: string;
  updated_at: string;
}

export interface CatalogItem {
  id: string;
  supplier_id: string;
  supplier_sku: string;
  category: CatalogCategory;
  description: string;
  uom_default: string;
  size_or_spec?: string;
  search_keywords?: string[];
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  // Enhanced attributes
  name?: string;
  secondary_category?: string;
  manufacturer?: string;
  use_type?: string;
  product_type?: string;
  dimension?: string;
  thickness?: string;
  length?: string;
  color?: string;
  finish?: string;
  wood_species?: string;
  bundle_type?: string;
  bundle_qty?: number;
  min_length?: number;
  max_length?: number;
  attributes?: Record<string, unknown>;
}

export interface CatalogSearchResult {
  id: string;
  supplier_id: string;
  supplier_sku: string;
  name: string | null;
  description: string;
  category: string;
  secondary_category: string | null;
  manufacturer: string | null;
  dimension: string | null;
  thickness: string | null;
  length: string | null;
  color: string | null;
  uom_default: string;
  size_or_spec: string | null;
  bundle_type: string | null;
  bundle_qty: number | null;
  wood_species: string | null;
  rank: number;
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  'Decking',
  'Drywall',
  'Engineered',
  'Exterior',
  'FramingAccessories',
  'FramingLumber',
  'Hardware',
  'Sheathing',
  'Structural',
  'Other',
];

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  Decking: 'Decking',
  Drywall: 'Drywall',
  Engineered: 'Engineered Wood',
  Exterior: 'Exterior Trim',
  FramingAccessories: 'Framing Accessories',
  FramingLumber: 'Framing Lumber',
  Hardware: 'Hardware',
  Sheathing: 'Sheathing & Plywood',
  Structural: 'Structural Steel',
  Other: 'Other',
};

export const UOM_OPTIONS = [
  'EA', // Each
  'LF', // Linear Feet
  'SF', // Square Feet
  'BF', // Board Feet
  'LB', // Pounds
  'CY', // Cubic Yards
  'BOX',
  'BAG',
  'ROLL',
  'PAIL',
  'GAL',
];

// CSV row type for import
export interface CatalogCSVRow {
  supplier_sku: string;
  category: string;
  description: string;
  uom_default: string;
  size_or_spec?: string;
  search_keywords?: string;
}

export function parseCSVToItems(csvText: string): CatalogCSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  const items: CatalogCSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 4) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    // Validate required fields
    if (!row.supplier_sku || !row.description) continue;

    items.push({
      supplier_sku: row.supplier_sku,
      category: normalizeCategory(row.category || 'Other'),
      description: row.description,
      uom_default: row.uom_default || 'EA',
      size_or_spec: row.size_or_spec || row['size'] || row['spec'] || undefined,
      search_keywords: row.search_keywords || row['keywords'] || undefined,
    });
  }

  return items;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result.map(v => v.replace(/^["']|["']$/g, ''));
}

function normalizeCategory(category: string): CatalogCategory {
  const normalized = category.toLowerCase().trim();
  const mapping: Record<string, CatalogCategory> = {
    // New inventory categories
    'decking': 'Decking',
    'drywall': 'Drywall',
    'engineered wood': 'Engineered',
    'engineered': 'Engineered',
    'exterior trim': 'Exterior',
    'exterior': 'Exterior',
    'framing accessories': 'FramingAccessories',
    'framing lumber': 'FramingLumber',
    'hardware': 'Hardware',
    'sheating and plywood': 'Sheathing',
    'sheathing': 'Sheathing',
    'structural steel': 'Structural',
    'structural': 'Structural',
    // Legacy mappings
    'dimensional': 'FramingLumber',
    'lumber': 'FramingLumber',
    'fasteners': 'FramingAccessories',
    'fastener': 'FramingAccessories',
    'other': 'Other',
  };
  return mapping[normalized] || 'Other';
}

// Enhanced CSV parsing for inventory format with sku, code, name, etc.
export interface InventoryCSVRow {
  sku: string;
  code: string;
  name: string;
  description: string;
  main_category: string;
  secondary_category: string;
  qty_type: string;
  attributes_json?: string;
}

// Enhanced catalog item for new CSV format
export interface EnhancedCatalogCSVRow {
  supplier_sku: string;
  name: string;
  description: string;
  category: string;
  secondary_category?: string;
  manufacturer?: string;
  use_type?: string;
  product_type?: string;
  dimension?: string;
  thickness?: string;
  length?: string;
  color?: string;
  finish?: string;
  wood_species?: string;
  bundle_type?: string;
  bundle_qty?: number;
  uom_default: string;
  size_or_spec?: string;
}

// Parse CSV with enhanced columns format
export function parseEnhancedInventoryCSV(csvText: string): EnhancedCatalogCSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, '').replace(/ /g, '_'));
  
  const items: EnhancedCatalogCSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    // Get SKU - try multiple column names
    const supplierSku = row.sku || row.supplier_sku || row.code || '';
    if (!supplierSku) continue;

    // Get name and description
    const name = row.name || '';
    const description = row.description || row.name || '';
    if (!description) continue;

    // Map main category to our enum
    const mainCategory = row.main_category || row.category || '';
    const mappedCategory = normalizeCategory(mainCategory);

    // Map qtyType to UOM
    const qtyType = row.qtytype || row.qty_type || 'count';
    const uomMapping: Record<string, string> = {
      'count': 'EA',
      'each': 'EA',
      'lf': 'LF',
      'sf': 'SF',
      'bf': 'BF',
    };
    const uom = uomMapping[qtyType.toLowerCase()] || 'EA';

    // Parse bundle count
    const bundleQty = row.bundle_count ? parseInt(row.bundle_count, 10) || undefined : undefined;

    items.push({
      supplier_sku: supplierSku,
      name: name,
      description: description,
      category: mappedCategory,
      secondary_category: row.secondary_category || undefined,
      manufacturer: row.manufacture || row.manufacturer || undefined,
      use_type: row.use || row.use_type || undefined,
      product_type: row.type || row.product_type || undefined,
      dimension: row.dimension || undefined,
      thickness: row.thickness || undefined,
      length: row.length || undefined,
      color: row.color || undefined,
      finish: row.finish || undefined,
      wood_species: row.wood_species || undefined,
      bundle_type: row.bundle_name || row.bundle_type || undefined,
      bundle_qty: bundleQty,
      uom_default: uom,
      size_or_spec: row.size_or_spec || undefined,
    });
  }

  return items;
}

export function parseInventoryCSV(csvText: string): CatalogCSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, '').replace(/ /g, '_'));
  
  const items: CatalogCSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 4) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    // Check if this is inventory format (has sku, code, name columns) or standard format
    const isInventoryFormat = 'sku' in row || 'code' in row;

    if (isInventoryFormat) {
      // Inventory format: sku, code, name, description, Main Category, Secondary Category, qtyType, attributes_json
      const supplierSku = row.sku || row.code || '';
      const description = row.name || row.description || '';
      const mainCategory = row.main_category || '';
      const secondaryCategory = row.secondary_category || '';
      
      if (!supplierSku || !description) continue;

      // Parse attributes_json for size/spec info
      let sizeOrSpec = '';
      let searchKeywords: string[] = [];
      
      if (row.attributes_json) {
        try {
          // Handle escaped quotes in JSON
          const jsonStr = row.attributes_json.replace(/""/g, '"');
          const attrs = JSON.parse(jsonStr);
          
          // Extract dimension and length for size_or_spec
          const parts: string[] = [];
          if (attrs.Dimension) parts.push(attrs.Dimension);
          if (attrs.Length) parts.push(attrs.Length);
          sizeOrSpec = parts.join(' ');
          
          // Build search keywords from attributes
          if (attrs.Color) searchKeywords.push(attrs.Color.toLowerCase());
          if (attrs.Manufacture) searchKeywords.push(attrs.Manufacture.toLowerCase());
        } catch {
          // JSON parse failed, that's ok
        }
      }

      // Map qtyType to UOM
      const qtyType = row.qtytype || row.qty_type || 'count';
      const uomMapping: Record<string, string> = {
        'count': 'EA',
        'each': 'EA',
        'lf': 'LF',
        'sf': 'SF',
        'bf': 'BF',
      };
      const uom = uomMapping[qtyType.toLowerCase()] || 'EA';

      // Add main and secondary category to keywords
      if (mainCategory) searchKeywords.push(mainCategory.toLowerCase());
      if (secondaryCategory) searchKeywords.push(secondaryCategory.toLowerCase());

      items.push({
        supplier_sku: supplierSku,
        category: normalizeCategory(mainCategory || 'Other'),
        description: description,
        uom_default: uom,
        size_or_spec: sizeOrSpec || undefined,
        search_keywords: searchKeywords.length > 0 ? searchKeywords.join(',') : undefined,
      });
    } else {
      // Standard format: supplier_sku, category, description, uom_default, size_or_spec, search_keywords
      if (!row.supplier_sku || !row.description) continue;

      items.push({
        supplier_sku: row.supplier_sku,
        category: normalizeCategory(row.category || 'Other'),
        description: row.description,
        uom_default: row.uom_default || 'EA',
        size_or_spec: row.size_or_spec || row['size'] || row['spec'] || undefined,
        search_keywords: row.search_keywords || row['keywords'] || undefined,
      });
    }
  }

  return items;
}
