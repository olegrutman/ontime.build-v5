import { supabase } from '@/integrations/supabase/client';

/** Fills a missing product code from the line's catalog product so a saved line never loses its catalog match. */
export async function fillMissingSkus<T extends { supplier_sku?: string | null; catalog_item_id?: string | null }>(items: T[]): Promise<T[]> {
  const ids = Array.from(new Set(items.filter(i => !i.supplier_sku && i.catalog_item_id).map(i => i.catalog_item_id as string)));
  if (!ids.length) return items;
  const { data } = await supabase.from('catalog_items').select('id,supplier_sku').in('id', ids);
  const byId = new Map((data || []).map(r => [r.id, r.supplier_sku]));
  return items.map(i => (!i.supplier_sku && i.catalog_item_id && byId.get(i.catalog_item_id) ? { ...i, supplier_sku: byId.get(i.catalog_item_id) } : i));
}
