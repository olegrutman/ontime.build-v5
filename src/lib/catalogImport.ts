/**
 * Supplier catalog file import (CSV text).
 * Accepts the standard template plus common alternate headers
 * (e.g. original_description, original_category, supplier_confirmed_price)
 * and keeps review/pricing-audit columns in item attributes.
 */
import { normalizeCategory, type CatalogCategory } from '@/types/supplier';

export interface CatalogImportRow {
  supplier_sku: string;
  name: string | null;
  description: string;
  category: CatalogCategory;
  secondary_category: string | null;
  manufacturer: string | null;
  dimension: string | null;
  thickness: string | null;
  length: string | null;
  color: string | null;
  wood_species: string | null;
  bundle_type: string | null;
  bundle_qty: number | null;
  uom_default: string;
  lead_time_days: number | null;
  min_order_qty: number | null;
  is_active: boolean;
  list_price: number | null;
  price_uom: string;
  /** Price cell had text that is not a usable number. */
  invalid_price: string | null;
  review: Record<string, string>;
}

export interface CatalogImportResult {
  rows: CatalogImportRow[];
  skippedRows: { line: number; reason: string }[];
  missingColumns: string[];
}

const ALIASES: Record<string, string[]> = {
  sku: ['sku', 'supplier_sku', 'code', 'item_code', 'product_code'],
  name: ['name', 'product_name'],
  description: ['description', 'original_description', 'item_description', 'product_description'],
  category: ['category', 'main_category', 'original_category'],
  secondary_category: ['secondary_category', 'subcategory', 'sub_category'],
  manufacturer: ['manufacturer', 'manufacture', 'brand'],
  uom: ['uom', 'unit', 'uom_default', 'qtytype', 'qty_type', 'unit_of_measure'],
  list_price: ['list_price', 'price', 'unit_price', 'supplier_confirmed_price', 'sell_price'],
  price_uom: ['price_uom', 'price_unit'],
  lead_time_days: ['lead_time_days', 'lead_time'],
  min_order_qty: ['min_order_qty', 'moq', 'minimum_order_qty'],
  status: ['status'],
  bundle_type: ['bundle_type', 'bundle_name'],
  bundle_qty: ['bundle_qty', 'bundle_count'],
};

const REVIEW_COLUMNS = [
  'original_supplier_sku', 'description_review_status', 'price_type', 'price_confidence',
  'pricing_method', 'benchmark_url', 'qa_flags', 'source_row',
];

const UOM_MAP: Record<string, string> = {
  count: 'EA', each: 'EA', ea: 'EA', pc: 'EA', pcs: 'EA', piece: 'EA',
  lf: 'LF', sf: 'SF', bf: 'BF', cs: 'CS', case: 'CS', pk: 'PK', pack: 'PK',
  bx: 'BX', box: 'BX', rl: 'RL', roll: 'RL', sht: 'SHT', sheet: 'SHT', gal: 'GAL', lb: 'LB',
};

/** RFC-4180 CSV parsing: quoted fields, escaped quotes, commas/newlines inside quotes. */
export function parseCsvRecords(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field); records.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); records.push(row); }
  return records.filter((r) => r.some((v) => v.trim() !== ''));
}

const normHeader = (h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Parses "$1,234.50" → 1234.5; returns undefined for non-numeric text, null for blank. */
export function parsePrice(raw: string): number | null | undefined {
  const s = raw.trim();
  if (!s) return null;
  const n = Number(s.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10000) / 10000 : undefined;
}

export function normalizeUom(raw: string): string {
  const s = raw.trim();
  if (!s) return 'EA';
  return UOM_MAP[s.toLowerCase()] ?? s.toUpperCase();
}

const toInt = (s: string) => { const n = parseInt(s, 10); return Number.isFinite(n) ? n : null; };
const toNum = (s: string) => { const n = Number(s); return s.trim() && Number.isFinite(n) ? n : null; };

export function parseCatalogImport(text: string): CatalogImportResult {
  const records = parseCsvRecords(text);
  if (records.length < 2) return { rows: [], skippedRows: [], missingColumns: ['sku', 'description'] };

  const headers = records[0].map(normHeader);
  const idx = (key: string) => {
    for (const alias of ALIASES[key] ?? [key]) {
      const i = headers.indexOf(alias);
      if (i >= 0) return i;
    }
    return -1;
  };
  const cols = Object.fromEntries(Object.keys(ALIASES).map((k) => [k, idx(k)])) as Record<string, number>;
  const missingColumns = ['sku', 'description'].filter((k) => cols[k] < 0);
  if (missingColumns.length) return { rows: [], skippedRows: [], missingColumns };

  const rows: CatalogImportRow[] = [];
  const skippedRows: CatalogImportResult['skippedRows'] = [];

  records.slice(1).forEach((rec, i) => {
    const line = i + 2;
    const get = (key: string) => (cols[key] >= 0 ? (rec[cols[key]] ?? '').trim() : '');
    const generic = (name: string) => { const j = headers.indexOf(name); return j >= 0 ? (rec[j] ?? '').trim() : ''; };
    const sku = get('sku');
    const description = get('description') || get('name');
    if (!sku) return skippedRows.push({ line, reason: 'Missing SKU' });
    if (!description) return skippedRows.push({ line, reason: 'Missing description' });

    const priceRaw = get('list_price');
    const price = parsePrice(priceRaw);
    const uom = normalizeUom(get('uom'));
    const review: Record<string, string> = {};
    REVIEW_COLUMNS.forEach((c) => { const v = generic(c); if (v) review[c] = v; });
    const originalCategory = get('category');
    if (originalCategory) review.original_category = originalCategory;

    rows.push({
      supplier_sku: sku,
      name: get('name') || null,
      description,
      category: normalizeCategory(originalCategory || 'Other'),
      secondary_category: get('secondary_category') || null,
      manufacturer: get('manufacturer') || null,
      dimension: generic('dimension') || null,
      thickness: generic('thickness') || null,
      length: generic('length') || null,
      color: generic('color') || null,
      wood_species: generic('wood_species') || null,
      bundle_type: get('bundle_type') || null,
      bundle_qty: toInt(get('bundle_qty')),
      uom_default: uom,
      lead_time_days: toInt(get('lead_time_days')),
      min_order_qty: toNum(get('min_order_qty')),
      is_active: get('status').toUpperCase() !== 'RETIRED',
      list_price: price ?? null,
      price_uom: get('price_uom') ? normalizeUom(get('price_uom')) : uom,
      invalid_price: price === undefined ? priceRaw : null,
      review,
    });
  });

  return { rows, skippedRows, missingColumns: [] };
}
