import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Supplier list price for a catalog item. Visible to the supplier's own org and
 * to buyers that share a project with that supplier (enforced by RLS).
 * Used as the last-resort default when a PO line has no estimate price.
 */
export function useCatalogPrice(catalogItemId: string | null | undefined) {
  return useQuery({
    queryKey: ['catalog-price', catalogItemId],
    enabled: !!catalogItemId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!catalogItemId) return null;
      const { data, error } = await supabase
        .from('catalog_prices')
        .select('list_price, price_uom')
        .eq('catalog_item_id', catalogItemId)
        .maybeSingle();
      if (error) return null;
      return data ? { listPrice: Number(data.list_price), priceUom: data.price_uom } : null;
    },
  });
}
