import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ScopeCatalogItem } from '@/types/changeOrder';
import type { CatalogDefinition, Zone } from '@/types/catalog';

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
  structural: 'Structural',
  envelope_wrb: 'WRB & Envelope',
  envelope_exterior: 'Exterior skin',
  demo: 'Demo',
  sheathing: 'Sheathing',
  fix: 'Backout & Fixes',
  general: 'General',
  interior_finish: 'Interior finishes',
  custom: 'Custom (org)',
};

const DIVISION_ICONS: Record<string, string> = {
  framing: '🔨',
  structural: '🏗️',
  envelope_wrb: '🛡️',
  envelope_exterior: '🏠',
  demo: '⛏️',
  sheathing: '▦',
  fix: '🔧',
  general: '•',
  interior_finish: '🪵',
  custom: '✎',
};

const CATEGORY_LABELS: Record<string, string> = {
  walls: 'Walls',
  openings: 'Openings',
  soffits: 'Soffits',
  enclosures: 'Enclosures',
  blocking: 'Blocking',
  floors: 'Floors',
  stairs: 'Stairs',
  beams: 'Beams',
  columns: 'Columns',
  connectors: 'Connectors',
  shear_lateral: 'Shear & lateral',
  shear_structural: 'Shear panels',
  repair: 'Repair',
  membrane: 'Membrane',
  flashing: 'Flashing',
  inspection: 'Inspection',
  selective_demo: 'Selective demo',
  general: 'General',
  deck_pergola_fence: 'Deck / pergola / fence',
  siding_trim: 'Siding & trim',
  other: 'Other',
  corrections: 'Corrections',
  misc: 'Miscellaneous',
};

function adaptToScopeCatalogItem(d: CatalogDefinition): ScopeCatalogItem {
  const categoryName = CATEGORY_LABELS[d.category] ?? d.category;
  return {
    id: d.id,
    item_name: d.canonical_name,
    unit: d.unit,
    division: d.division,
    category_id: d.category,
    category_name: categoryName,
    group_id: d.category,
    group_label: categoryName,
    category_color: '',
    category_bg: '',
    category_icon: DIVISION_ICONS[d.division] ?? '•',
    sort_order: d.sort_order ?? 0,
    org_id: d.org_id,
  };
}

export interface FilterContext {
  zone: Zone | null;
  reason: string | null;
  workType: string | null;
}

export interface FilteredCatalog {
  primary: ScopeCatalogItem[];   // matches zone + reason + workType
  secondary: ScopeCatalogItem[]; // matches zone but fails reason or workType
  hidden: ScopeCatalogItem[];    // everything else
}

export function useScopeCatalog() {
  const { userOrgRoles } = useAuth();
  const orgId = userOrgRoles?.[0]?.organization_id ?? null;

  const { data: defs = [], isLoading } = useQuery({
    queryKey: ['catalog-definitions', orgId],
    queryFn: async () => {
      // RLS already enforces (platform OR own-org). We just sort.
      const { data, error } = await supabase
        .from('catalog_definitions')
        .select('*')
        .is('deprecated_at', null)
        .order('division')
        .order('sort_order', { nullsFirst: false });

      if (error) throw error;
      return (data ?? []) as CatalogDefinition[];
    },
    staleTime: 1000 * 60 * 60,
  });

  const items = useMemo(() => defs.map(adaptToScopeCatalogItem), [defs]);
  // Keep raw definitions accessible for filterByContext (avoids re-mapping).
  const itemsByDefId = useMemo(() => {
    const map = new Map<string, CatalogDefinition>();
    for (const d of defs) map.set(d.id, d);
    return map;
  }, [defs]);

  // ── Drill-down structure (Show everything tier) ───────────────────
  const divisions = useMemo<CatalogDivision[]>(() => {
    const out: CatalogDivision[] = [];
    const divMap = new Map<string, CatalogDivision>();
    const catMap = new Map<string, CatalogCategory>();

    for (const item of items) {
      if (!divMap.has(item.division)) {
        const div: CatalogDivision = {
          division: item.division,
          label: DIVISION_LABELS[item.division] ?? item.division,
          color: '',
          bg: '',
          icon: DIVISION_ICONS[item.division] ?? '•',
          categories: [],
          itemCount: 0,
        };
        divMap.set(item.division, div);
        out.push(div);
      }

      const divKey = `${item.division}::${item.category_id}`;
      if (!catMap.has(divKey)) {
        const cat: CatalogCategory = {
          category_id: item.category_id,
          category_name: item.category_name,
          category_color: '',
          category_bg: '',
          category_icon: divMap.get(item.division)!.icon,
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

    return out;
  }, [items]);

  // ── Search ────────────────────────────────────────────────────────
  function search(query: string): (ScopeCatalogItem & { path: string })[] {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase();
    const results: (ScopeCatalogItem & { path: string })[] = [];
    for (const item of items) {
      if (
        item.item_name.toLowerCase().includes(q) ||
        item.category_name.toLowerCase().includes(q) ||
        item.division.toLowerCase().includes(q)
      ) {
        results.push({
          ...item,
          path: `${DIVISION_LABELS[item.division] ?? item.division} › ${item.category_name}`,
        });
      }
    }
    return results;
  }

  // ── Context filter (Phase 1 core feature) ─────────────────────────
  function filterByContext(ctx: FilterContext): FilteredCatalog {
    const primary: ScopeCatalogItem[] = [];
    const secondary: ScopeCatalogItem[] = [];
    const hidden: ScopeCatalogItem[] = [];
    const { zone, reason, workType } = ctx;

    for (const item of items) {
      const def = itemsByDefId.get(item.id);
      if (!def) {
        hidden.push(item);
        continue;
      }

      // Zone match: 'any' or null applicable_zone is wildcard;
      // null context zone is also wildcard (don't have one yet).
      const zoneOk =
        !zone ||
        !def.applicable_zone ||
        def.applicable_zone === 'any' ||
        def.applicable_zone === zone;

      const workTypeOk =
        !workType ||
        def.applicable_work_types.length === 0 ||
        def.applicable_work_types.includes(workType);

      const reasonOk =
        !reason ||
        def.applicable_reasons.length === 0 ||
        def.applicable_reasons.includes(reason);

      if (zoneOk && workTypeOk && reasonOk) {
        primary.push(item);
      } else if (zoneOk) {
        secondary.push(item);
      } else {
        hidden.push(item);
      }
    }

    return { primary, secondary, hidden };
  }

  return { divisions, allItems: items, search, filterByContext, isLoading };
}
