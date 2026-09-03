import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CatalogCategory } from '@/types/supplier';

export interface CatalogManagerItem {
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
  wood_species: string | null;
  bundle_type: string | null;
  bundle_qty: number | null;
  uom_default: string;
  is_active: boolean;
  discontinued_at: string | null;
  lead_time_days: number | null;
  min_order_qty: number | null;
  created_at: string;
  list_price: number | null;
  price_uom: string | null;
  price_effective_from: string | null;
}

export interface CatalogFilters {
  search: string;
  category: string; // 'all' | CatalogCategory
  manufacturer: string; // 'all' | name
  status: 'all' | 'active' | 'inactive' | 'unpriced' | 'uncategorized';
  page: number;
  pageSize: number;
}

export const DEFAULT_CATALOG_FILTERS: CatalogFilters = {
  search: '',
  category: 'all',
  manufacturer: 'all',
  status: 'all',
  page: 0,
  pageSize: 50,
};

const ITEM_COLUMNS =
  'id, supplier_id, supplier_sku, name, description, category, secondary_category, manufacturer, dimension, thickness, length, color, wood_species, bundle_type, bundle_qty, uom_default, is_active, discontinued_at, lead_time_days, min_order_qty, created_at';

function applyFilters(
  // deliberately loose: PostgREST builder types are not exported
  query: any,
  filters: Pick<CatalogFilters, 'search' | 'category' | 'manufacturer' | 'status'>,
) {
  if (filters.category !== 'all') query = query.eq('category', filters.category);
  if (filters.manufacturer !== 'all') query = query.eq('manufacturer', filters.manufacturer);
  if (filters.status === 'active') query = query.eq('is_active', true);
  if (filters.status === 'inactive') query = query.eq('is_active', false);
  if (filters.status === 'uncategorized') query = query.eq('category', 'Other');
  if (filters.search.trim()) {
    const q = filters.search.trim().replace(/[%,()]/g, ' ');
    query = query.or(
      `supplier_sku.ilike.%${q}%,name.ilike.%${q}%,description.ilike.%${q}%,manufacturer.ilike.%${q}%`,
    );
  }
  return query;
}

async function attachPrices(items: any[]): Promise<CatalogManagerItem[]> {
  if (items.length === 0) return [];
  const ids = items.map((i) => i.id);
  const { data: prices } = await supabase
    .from('catalog_prices')
    .select('catalog_item_id, list_price, price_uom, effective_from')
    .in('catalog_item_id', ids);

  const priceMap = new Map((prices || []).map((p) => [p.catalog_item_id, p]));

  return items.map((item) => {
    const p = priceMap.get(item.id);
    return {
      ...item,
      list_price: p ? Number(p.list_price) : null,
      price_uom: p?.price_uom ?? null,
      price_effective_from: p?.effective_from ?? null,
    } as CatalogManagerItem;
  });
}

/** Paginated, server-filtered catalog for the supplier management console. */
export function useCatalogManagerItems(supplierId: string | null, filters: CatalogFilters) {
  return useQuery({
    queryKey: ['catalog-manager', supplierId, filters],
    enabled: !!supplierId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!supplierId) return { rows: [] as CatalogManagerItem[], total: 0 };

      const from = filters.page * filters.pageSize;
      const to = from + filters.pageSize - 1;

      // "unpriced" needs the price table to filter, so resolve those ids first
      let unpricedIds: string[] | null = null;
      if (filters.status === 'unpriced') {
        const { data: priced } = await supabase
          .from('catalog_prices')
          .select('catalog_item_id')
          .eq('supplier_id', supplierId);
        unpricedIds = (priced || []).map((p) => p.catalog_item_id);
      }

      let query = supabase
        .from('catalog_items')
        .select(ITEM_COLUMNS, { count: 'exact' })
        .eq('supplier_id', supplierId);

      query = applyFilters(query, filters);
      if (unpricedIds && unpricedIds.length > 0) {
        query = query.not('id', 'in', `(${unpricedIds.join(',')})`);
      }

      const { data, error, count } = await query
        .order('is_active', { ascending: false })
        .order('category', { ascending: true })
        .order('supplier_sku', { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { rows: await attachPrices(data || []), total: count || 0 };
    },
  });
}

/** Facets + data-quality counters for the console header. */
export function useCatalogFacets(supplierId: string | null) {
  return useQuery({
    queryKey: ['catalog-facets', supplierId],
    enabled: !!supplierId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!supplierId) return null;

      const [items, prices] = await Promise.all([
        supabase
          .from('catalog_items')
          .select('category, manufacturer, is_active')
          .eq('supplier_id', supplierId),
        supabase.from('catalog_prices').select('catalog_item_id').eq('supplier_id', supplierId),
      ]);

      const rows = items.data || [];
      const categoryCounts = new Map<string, number>();
      const manufacturers = new Set<string>();
      let activeCount = 0;

      rows.forEach((r) => {
        categoryCounts.set(r.category, (categoryCounts.get(r.category) || 0) + 1);
        if (r.manufacturer) manufacturers.add(r.manufacturer);
        if (r.is_active) activeCount += 1;
      });

      return {
        total: rows.length,
        activeCount,
        inactiveCount: rows.length - activeCount,
        uncategorizedCount: categoryCounts.get('Other') || 0,
        pricedCount: (prices.data || []).length,
        unpricedCount: Math.max(0, rows.length - (prices.data || []).length),
        categoryCounts: Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]),
        manufacturers: Array.from(manufacturers).sort(),
      };
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['catalog-manager'] });
  qc.invalidateQueries({ queryKey: ['catalog-facets'] });
}

/** Set or clear the single list price for one product. */
export function useSetCatalogPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      catalogItemId: string;
      supplierId: string;
      listPrice: number | null;
      priceUom: string;
    }) => {
      if (input.listPrice == null) {
        const { error } = await supabase
          .from('catalog_prices')
          .delete()
          .eq('catalog_item_id', input.catalogItemId);
        if (error) throw error;
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from('catalog_prices').upsert(
        {
          catalog_item_id: input.catalogItemId,
          supplier_id: input.supplierId,
          list_price: input.listPrice,
          price_uom: input.priceUom,
          updated_by: auth.user?.id ?? null,
        },
        { onConflict: 'catalog_item_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

export interface CatalogBulkPatch {
  category?: CatalogCategory;
  secondary_category?: string | null;
  manufacturer?: string | null;
  uom_default?: string;
  lead_time_days?: number | null;
  min_order_qty?: number | null;
  is_active?: boolean;
  discontinued_at?: string | null;
}

/** Apply the same field changes to every selected product. */
export function useBulkUpdateCatalogItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { ids: string[]; patch: CatalogBulkPatch }) => {
      if (input.ids.length === 0) return;
      const { error } = await supabase
        .from('catalog_items')
        .update(input.patch as never)
        .in('id', input.ids);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

/** Apply one list price to every selected product. */
export function useBulkSetCatalogPrice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      ids: string[];
      supplierId: string;
      listPrice: number | null;
      priceUom: string;
    }) => {
      if (input.ids.length === 0) return;
      if (input.listPrice == null) {
        const { error } = await supabase
          .from('catalog_prices')
          .delete()
          .in('catalog_item_id', input.ids);
        if (error) throw error;
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      const rows = input.ids.map((id) => ({
        catalog_item_id: id,
        supplier_id: input.supplierId,
        list_price: input.listPrice as number,
        price_uom: input.priceUom,
        updated_by: auth.user?.id ?? null,
      }));
      const { error } = await supabase
        .from('catalog_prices')
        .upsert(rows, { onConflict: 'catalog_item_id' });
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

/** Fetch every row matching the current filters (used for CSV export). */
export async function fetchCatalogForExport(
  supplierId: string,
  filters: Pick<CatalogFilters, 'search' | 'category' | 'manufacturer' | 'status'>,
): Promise<CatalogManagerItem[]> {
  let query = supabase.from('catalog_items').select(ITEM_COLUMNS).eq('supplier_id', supplierId);
  query = applyFilters(query, filters);
  const { data, error } = await query.order('supplier_sku', { ascending: true }).limit(5000);
  if (error) throw error;
  return attachPrices(data || []);
}
