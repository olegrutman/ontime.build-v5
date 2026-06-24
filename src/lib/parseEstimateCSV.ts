/**
 * Pack-aware CSV parser for supplier estimates.
 * Handles noisy supplier quote exports: strips page headers/footers,
 * normalises SKUs, groups items by pack_name, and excludes pricing.
 */

export interface ParsedEstimateItem {
  supplier_sku: string;
  description: string;
  quantity: number;
  uom: string;
  ext_price: number;
  unit_price: number;
}

export interface ParsedPack {
  name: string;
  items: ParsedEstimateItem[];
}

export interface ParseResult {
  packs: ParsedPack[];
  totalItems: number;
  discardedRows: number;
}

// ── Noise-row detection ──────────────────────────────────────────────

const DATE_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;
const PAGE_MARKER  = /\*QU-\d+/;
const NOISE_DESC   = /Quote Date|Page \d+ of \d+|E BATES AVE|E Smith Rd|Sales Tax|Quotation Total|PLEASE NOTE|Date Printed/i;

function isNoiseRow(packName: string, sku: string, desc: string): boolean {
  if (!packName || packName.trim() === '') return true;
  if (packName.startsWith('End of')) return true;
  if (DATE_PATTERN.test(sku)) return true;
  if (PAGE_MARKER.test(sku)) return true;
  if (NOISE_DESC.test(desc)) return true;
  if (/^\d{5}$/.test(sku) && /AVE|RD|ST|BLVD/i.test(desc)) return true;
  return false;
}

// ── SKU normalisation ────────────────────────────────────────────────

function normaliseSku(raw: string): string {
  return raw
    .replace(/^["']+|["']+$/g, '')   // strip quotes
    .replace(/\s+/g, '')             // strip spaces
    .toUpperCase()
    .trim();
}

// ── Clean pack name (strip trailing numbers) ─────────────────────────

function cleanPackName(raw: string): string {
  return raw.replace(/\s+\d+$/, '').trim();
}

// ── Description cleaner ──────────────────────────────────────────────
// The messy description column often contains pricing data embedded.
// e.g. "#2 AND BTR DOUG FIR 5 24 799.00 153.41 2412DF mbf PC"
// We extract just the product description portion (before the line number).

function cleanDescription(raw: string, sku: string): string {
  // Remove surrounding quotes
  let desc = raw.replace(/^["']+|["']+$/g, '').trim();
  
  // Try to extract just the product description before embedded numbers
  // Pattern: description + line_number + qty + price_per + ext_price + alt_sku + uom + uom
  const match = desc.match(/^(.+?)\s+\d+\s+[\d,]+\s+[\d,.]+\s+[\d,.]+\s+\w+/);
  if (match) {
    desc = match[1].trim();
  }
  
  // If description starts with a dimension that duplicates the SKU, combine them
  if (!desc || desc.length < 3) {
    desc = sku;
  }
  
  return desc;
}

// ── Detect UOM from description ──────────────────────────────────────

function detectUom(desc: string, rawQtyStr: string): string {
  const uomPatterns: Record<string, RegExp> = {
    'PC':  /\bPC\b/i,
    'EA':  /\bEA\b/i,
    'RL':  /\bRL\b|\bROLL\b/i,
    'BX':  /\bBX\b|\bBOX\b/i,
    'MSF': /\bMSF\b/i,
    'BDL': /\bBDL\b|\bBUNDLE\b/i,
    'CTN': /\bCTN\b|\bCARTON\b/i,
  };

  for (const [uom, pattern] of Object.entries(uomPatterns)) {
    if (pattern.test(desc)) return uom;
  }

  return 'EA';
}

// ── Main parser ──────────────────────────────────────────────────────

export function parseEstimateCSV(csvText: string): ParseResult {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    return { packs: [], totalItems: 0, discardedRows: 0 };
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVRow(headerLine).map(h => h.trim().toLowerCase());

  const packIdx = headers.findIndex(h => h.includes('pack'));
  const skuIdx  = headers.findIndex(h => h.includes('sku'));
  const descIdx = headers.findIndex(h => h.includes('desc'));
  const qtyIdx  = headers.findIndex(h => h.includes('qty') || h.includes('quantity'));
  const unitIdx = headers.findIndex(h => h.includes('unit') || h.includes('uom'));
  const extPriceIdx = headers.findIndex(h =>
    h.includes('ext') || h.includes('line_total') || h.includes('total') || h.includes('amount')
  );
  const unitPriceIdx = headers.findIndex(h =>
    (h.includes('unit') && h.includes('price')) || h === 'price' || h === 'cost'
  );

  if (packIdx === -1 || descIdx === -1) {
    // Fallback: try without pack column
    return { packs: [], totalItems: 0, discardedRows: lines.length - 1 };
  }

  const packMap = new Map<string, ParsedEstimateItem[]>();
  let discarded = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    
    const rawPack = (cols[packIdx] || '').trim();
    const rawSku  = (cols[skuIdx] || '').trim();
    const rawDesc = (cols[descIdx] || '').trim();
    const rawQty  = (cols[qtyIdx] || '').trim();

    if (isNoiseRow(rawPack, rawSku, rawDesc)) {
      discarded++;
      continue;
    }

    const packName = cleanPackName(rawPack);
    const sku = normaliseSku(rawSku);
    const description = cleanDescription(rawDesc, rawSku);
    const quantity = parseFloat(rawQty.replace(/,/g, '')) || 0;
    
    if (quantity <= 0 || !sku) {
      discarded++;
      continue;
    }

    const uom = detectUom(rawDesc, rawQty);

    // Parse pricing
    const rawExtPrice = extPriceIdx >= 0 ? (cols[extPriceIdx] || '').trim() : '';
    const rawUnitPrice = unitPriceIdx >= 0 ? (cols[unitPriceIdx] || '').trim() : '';
    const ext_price = parseFloat(rawExtPrice.replace(/[$,]/g, '')) || 0;
    let unit_price = parseFloat(rawUnitPrice.replace(/[$,]/g, '')) || 0;

    // Calculate unit_price from ext_price if not directly available
    if (unit_price <= 0 && ext_price > 0 && quantity > 0) {
      unit_price = Math.round((ext_price / quantity) * 100) / 100;
    }

    if (!packMap.has(packName)) {
      packMap.set(packName, []);
    }

    packMap.get(packName)!.push({
      supplier_sku: sku,
      description,
      quantity,
      uom,
      ext_price,
      unit_price,
    });
  }

  const packs: ParsedPack[] = [];
  let totalItems = 0;

  for (const [name, items] of packMap) {
    packs.push({ name, items });
    totalItems += items.length;
  }

  return { packs, totalItems, discardedRows: discarded };
}

// ── CSV row parser (handles quoted fields with commas) ───────────────

function parseCSVRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
