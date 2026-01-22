export type CatalogCategory = 'Dimensional' | 'Engineered' | 'Sheathing' | 'Hardware' | 'Fasteners' | 'Other';

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
}

export interface CatalogSearchResult extends Omit<CatalogItem, 'created_at' | 'updated_at' | 'supplier'> {
  rank: number;
}

export const CATALOG_CATEGORIES: CatalogCategory[] = [
  'Dimensional',
  'Engineered',
  'Sheathing',
  'Hardware',
  'Fasteners',
  'Other',
];

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  Dimensional: 'Dimensional Lumber',
  Engineered: 'Engineered Wood',
  Sheathing: 'Sheathing',
  Hardware: 'Hardware',
  Fasteners: 'Fasteners',
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

function normalizeCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  const mapping: Record<string, CatalogCategory> = {
    'dimensional': 'Dimensional',
    'lumber': 'Dimensional',
    'engineered': 'Engineered',
    'engineered wood': 'Engineered',
    'sheathing': 'Sheathing',
    'hardware': 'Hardware',
    'fasteners': 'Fasteners',
    'fastener': 'Fasteners',
    'other': 'Other',
  };
  return mapping[normalized] || 'Other';
}
