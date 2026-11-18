import { supabase } from '@/integrations/supabase/client';

/** Fills a missing product code from the line's catalog product so a saved line never loses its catalog match. */
export async function fillMissingSkus<T extends { supplier_sku?: string | null; catalog_item_id?: string | null }>(items: T[]): Promise<T[]> {
  const needsCode = (item: T) => !item.supplier_sku?.trim() && !!item.catalog_item_id;
  const ids = Array.from(new Set(items.filter(needsCode).map(i => i.catalog_item_id as string)));
  if (!ids.length) return items;

  const { data, error } = await supabase.from('catalog_items').select('id,supplier_sku').in('id', ids);
  if (error) throw new Error(`Could not verify catalog product codes: ${error.message}`);
  const byId = new Map((data || []).map(r => [r.id, r.supplier_sku]));

  return items.map(item => {
    if (!needsCode(item)) return item;
    const supplierSku = byId.get(item.catalog_item_id as string);
    if (!supplierSku) throw new Error('A selected catalog product has no verifiable product code. Choose it again before saving.');
    return { ...item, supplier_sku: supplierSku };
  });
}
