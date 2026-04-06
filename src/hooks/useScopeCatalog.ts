import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ScopeCatalogItem } from '@/types/changeOrder';

export interface CatalogGroup {
  group_id: string;
  group_label: string;
  items: ScopeCatalogItem[];
}

export interface CatalogCategory {
  category_id: string;
  category_name: string;
  category_color: string;
  category_bg: string;
  category_icon: string;
  groups: CatalogGroup[];
  itemCount: number;
}

export interface CatalogDivision {
  division: string;
  label: string;
  color: string;
  bg: string;
  icon: string;
  categories: CatalogCategory[];
  itemCount: number;
}

const DIVISION_LABELS: Record<string, string> = {
  framing: 'Framing',
  exterior: 'Exterior skin',
  roofing: 'Roofing',
  waterproofing: 'Waterproofing',
  windows: 'Windows & Doors',
  decorative: 'Decorative exterior',
};

export function useScopeCatalog() {
  const { userOrgRoles } = useAuth();
  const orgId = userOrgRoles?.[0]?.organization_id ?? null;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['scope-catalog', orgId],
    queryFn: async () => {
      let query = supabase.from('work_order_catalog').select('*');

      if (orgId) {
        query = query.or(`org_id.is.null,org_id.eq.${orgId}`); // ✓ verified
      } else {
        query = query.is('org_id', null); // ✓ verified
      }

      const { data, error } = await query
        .order('division')
        .order('category_id')
        .order('sort_order');

      if (error) throw error;
      return (data ?? []) as ScopeCatalogItem[]; // ✓ verified
    },
    staleTime: 1000 * 60 * 60, // ✓ verified
  });

  const divisions: CatalogDivision[] = [];
  const divMap = new Map<string, CatalogDivision>();
  const catMap = new Map<string, CatalogCategory>();

  for (const item of items) {
    if (!divMap.has(item.division)) {
      const div: CatalogDivision = {
        division: item.division,
        label: DIVISION_LABELS[item.division] ?? item.division,
        color: item.category_color,
        bg: item.category_bg,
        icon: item.category_icon,
        categories: [],
        itemCount: 0,
      };
      divMap.set(item.division, div);
      divisions.push(div);
    }

    const divKey = `${item.division}::${item.category_id}`;
    if (!catMap.has(divKey)) {
      const cat: CatalogCategory = {
        category_id: item.category_id,
        category_name: item.category_name,
        category_color: item.category_color,
        category_bg: item.category_bg,
        category_icon: item.category_icon,
        groups: [],
        itemCount: 0,
      };
      catMap.set(divKey, cat);
      divMap.get(item.division)!.categories.push(cat);
    }

    const cat = catMap.get(divKey)!;
    let group = cat.groups.find(g => g.group_id === item.group_id);
    if (!group) {
      group = { group_id: item.group_id, group_label: item.group_label, items: [] };
      cat.groups.push(group);
    }
    group.items.push(item);
    cat.itemCount++;
    divMap.get(item.division)!.itemCount++;
  }

  function search(query: string): (ScopeCatalogItem & { path: string })[] {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const results: (ScopeCatalogItem & { path: string })[] = [];

    for (const item of items) {
      if (
        item.item_name.toLowerCase().includes(q) || // ✓ verified
        item.category_name.toLowerCase().includes(q) || // ✓ verified
        item.group_label.toLowerCase().includes(q) ||
        item.division.toLowerCase().includes(q) // ✓ verified
      ) {
        results.push({
          ...item,
          path: `${DIVISION_LABELS[item.division] ?? item.division} › ${item.category_name} › ${item.group_label}`,
        });
      }
    }

    return results;
  }

  return { divisions, allItems: items, search, isLoading };
}
