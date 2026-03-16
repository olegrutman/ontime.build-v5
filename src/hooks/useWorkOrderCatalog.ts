import { useQuery } from '@tanstack/react-query';
import { useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CatalogItem, CatalogDivision, CatalogCategory, CatalogGroup } from '@/types/quickLog';
import { DIVISION_LABELS } from '@/types/quickLog';

export function useWorkOrderCatalog(orgId?: string) {
  const query = useQuery({
    queryKey: ['work-order-catalog', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_order_catalog')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CatalogItem[];
    },
  });

  const items = query.data || [];

  const divisions = useMemo<CatalogDivision[]>(() => {
    const divMap = new Map<string, CatalogItem[]>();
    for (const item of items) {
      const arr = divMap.get(item.division) || [];
      arr.push(item);
      divMap.set(item.division, arr);
    }

    return Array.from(divMap.entries()).map(([division, divItems]) => {
      const catMap = new Map<string, CatalogItem[]>();
      for (const item of divItems) {
        const arr = catMap.get(item.category_id) || [];
        arr.push(item);
        catMap.set(item.category_id, arr);
      }

      const categories: CatalogCategory[] = Array.from(catMap.entries()).map(([catId, catItems]) => {
        const first = catItems[0];
        const groupMap = new Map<string, CatalogItem[]>();
        for (const item of catItems) {
          const arr = groupMap.get(item.group_id) || [];
          arr.push(item);
          groupMap.set(item.group_id, arr);
        }

        const groups: CatalogGroup[] = Array.from(groupMap.entries()).map(([gId, gItems]) => ({
          group_id: gId,
          group_label: gItems[0].group_label,
          items: gItems,
        }));

        return {
          category_id: catId,
          category_name: first.category_name,
          category_color: first.category_color || '#6B7280',
          category_bg: first.category_bg || '#F9FAFB',
          category_icon: first.category_icon || '•',
          groups,
          itemCount: catItems.length,
        };
      });

      return {
        division,
        label: DIVISION_LABELS[division] || division,
        categories,
        itemCount: divItems.length,
      };
    });
  }, [items]);

  const search = useCallback((query: string): (CatalogItem & { path: string })[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return items
      .filter(i => i.item_name.toLowerCase().includes(q) || i.category_name.toLowerCase().includes(q) || i.group_label.toLowerCase().includes(q))
      .map(i => ({
        ...i,
        path: `${DIVISION_LABELS[i.division] || i.division} › ${i.category_name} › ${i.group_label}`,
      }));
  }, [items]);

  return {
    items,
    divisions,
    search,
    loading: query.isLoading,
  };
}
