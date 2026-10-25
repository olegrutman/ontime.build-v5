/**
 * One-off admin import: loads the Ontime Master Catalog CSV from storage
 * (po-documents/_admin/master-catalog.csv) into catalog_items + catalog_prices
 * for the system supplier. Gated by a shared token header.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SYSTEM_SUPPLIER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const IMPORT_TOKEN = 'otb-master-import-2026-10-25';
const BUCKET = 'po-documents';
const PATH = '_admin/master-catalog.csv';

const CAT_MAP: Record<string, string> = {
  'Joist & Beam Hangers': 'Hardware',
  'Structural Ties & Straps': 'Hardware',
  'Post Bases & Caps': 'Hardware',
  'Brackets, Plates & Clips': 'Hardware',
  'Concrete Anchors & Hold-Downs': 'Hardware',
  'Posts & Timbers': 'FramingLumber',
  'Framing Lumber': 'FramingLumber',
  'Appearance & Finish Lumber': 'FramingLumber',
  'Pressure-Treated Lumber': 'FramingLumber',
  'Engineered Lumber': 'Engineered',
  'Deck Boards': 'Decking',
  'Deck Fascia & Trim': 'Decking',
  'Deck & Railing Accessories': 'Decking',
  'Exterior Trim & Soffit': 'Exterior',
  'Siding & Exterior Panels': 'Exterior',
  'Weather Barriers & Flashing': 'Exterior',
  'Structural Steel Beams': 'Structural',
  'Steel Columns & Posts': 'Structural',
  'Structural Steel Angles': 'Structural',
  'Nails, Screws & Fasteners': 'Fasteners',
  'Sheathing & Subfloor': 'Sheathing',
  'Drywall & Accessories': 'Drywall',
  'Adhesives & Application Tools': 'Adhesives',
  'Stair Components': 'Other',
};

/** RFC-4180 CSV parsing: quoted fields, escaped quotes, commas/newlines inside quotes. */
function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
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

const num = (v: string) => {
  const n = Number((v || '').trim());
  return (v || '').trim() && Number.isFinite(n) ? n : null;
};
const int = (v: string) => {
  const n = parseInt((v || '').trim(), 10);
  return Number.isFinite(n) ? n : null;
};
const str = (v: string) => ((v || '').trim() ? v.trim() : null);

Deno.serve(async (req) => {
  if (req.headers.get('x-import-token') !== IMPORT_TOKEN) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(PATH);
  if (dlErr || !file) {
    return new Response(JSON.stringify({ error: 'CSV not found in storage', detail: dlErr?.message }), { status: 400 });
  }
  const records = parseCsv(await file.text());
  const headers = records[0].map((h) => h.trim());
  const col = (row: string[], name: string) => row[headers.indexOf(name)] ?? '';

  const items = records.slice(1).map((r) => {
    const attrs: Record<string, string> = {};
    for (const k of ['family', 'category', 'source_name', 'source_qty_type', 'pricing_basis',
      'price_confidence', 'data_quality', 'grade_or_use', 'evidence_url']) {
      const v = str(col(r, k));
      if (v) attrs[k] = v;
    }
    const origSku = str(col(r, 'supplier_sku'));
    if (origSku) attrs.original_supplier_sku = origSku;
    return {
      supplier_id: SYSTEM_SUPPLIER_ID,
      supplier_sku: col(r, 'sku').trim(),
      category: CAT_MAP[col(r, 'category').trim()] ?? 'Other',
      description: col(r, 'description').trim(),
      uom_default: str(col(r, 'uom')) ?? 'EA',
      name: str(col(r, 'name')),
      secondary_category: str(col(r, 'subcategory')),
      manufacturer: str(col(r, 'manufacturer')),
      dimension: str(col(r, 'dimension')),
      thickness: str(col(r, 'thickness')),
      length: str(col(r, 'length')),
      color: str(col(r, 'color')),
      finish: str(col(r, 'finish')),
      wood_species: str(col(r, 'wood_species')),
      bundle_type: str(col(r, 'package_type')),
      bundle_qty: int(col(r, 'package_quantity')),
      min_length: num(col(r, 'min_length')),
      max_length: num(col(r, 'max_length')),
      length_increment: num(col(r, 'length_increment')),
      length_unit: str(col(r, 'length_unit')),
      lead_time_days: int(col(r, 'lead_time_days')),
      is_active: true,
      discontinued_at: null,
      attributes: attrs,
      updated_at: new Date().toISOString(),
    };
  }).filter((i) => i.supplier_sku && i.description);

  let upserted = 0;
  const errors: string[] = [];
  for (let i = 0; i < items.length; i += 400) {
    const { error } = await supabase
      .from('catalog_items')
      .upsert(items.slice(i, i + 400), { onConflict: 'supplier_id,supplier_sku' });
    if (error) errors.push(`items batch ${i}: ${error.message}`);
    else upserted += Math.min(400, items.length - i);
  }

  // Prices: resolve item ids, then upsert by catalog_item_id
  const { data: dbItems, error: fetchErr } = await supabase
    .from('catalog_items')
    .select('id, supplier_sku')
    .eq('supplier_id', SYSTEM_SUPPLIER_ID);
  if (fetchErr) errors.push(`fetch ids: ${fetchErr.message}`);
  const idBySku = new Map((dbItems ?? []).map((d) => [d.supplier_sku, d.id]));

  const prices = records.slice(1)
    .map((r) => ({
      catalog_item_id: idBySku.get(col(r, 'sku').trim()),
      supplier_id: SYSTEM_SUPPLIER_ID,
      list_price: num(col(r, 'list_price')),
      price_uom: str(col(r, 'price_uom')) ?? 'EA',
      notes: 'Ontime master catalog 2026-10-25',
      updated_at: new Date().toISOString(),
    }))
    .filter((p) => p.catalog_item_id && p.list_price != null);

  let priced = 0;
  for (let i = 0; i < prices.length; i += 400) {
    const { error } = await supabase
      .from('catalog_prices')
      .upsert(prices.slice(i, i + 400), { onConflict: 'catalog_item_id' });
    if (error) errors.push(`prices batch ${i}: ${error.message}`);
    else priced += Math.min(400, prices.length - i);
  }

  return new Response(JSON.stringify({ parsed: items.length, upserted, priced, errors }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
