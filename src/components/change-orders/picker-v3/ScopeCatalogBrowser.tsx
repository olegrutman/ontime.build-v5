import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Search, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useScopeCatalog, type CatalogDivision, type FilterContext } from '@/hooks/useScopeCatalog';
import { resolveZoneFromLocationTag } from '@/lib/resolveZone';
import type { ScopeCatalogItem } from '@/types/changeOrder';
import type { PickerState, PickerAction } from './types';
// (CATEGORY_TO_SYSTEM lives in narrative.ts; we use its inverse below.)

interface ScopeCatalogBrowserProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
}

// Inverse of CATEGORY_TO_SYSTEM — given the chosen system in Step 1, which
// catalog categories are actually relevant? Used to narrow "Suggested" so we
// don't drop the whole catalog on the user (which is what was happening when
// every seeded item carries applicable_zone='any' and empty filter arrays).
const SYSTEM_TO_CATEGORIES: Record<string, string[]> = {
  wall: ['walls', 'enclosures', 'shear_lateral', 'shear_structural', 'wall_finish', 'blocking', 'openings'],
  floor: ['floors', 'beams', 'blocking'],
  ceiling: ['soffits', 'ceiling_finish', 'blocking'],
  roof: ['membrane', 'flashing', 'blocking'],
  exterior: ['siding_trim', 'membrane', 'flashing', 'deck_pergola_fence'],
  openings: ['openings', 'flashing'],
  deck: ['deck_pergola_fence', 'floors', 'beams'],
  stair: ['stairs'],
};

// Common action verbs we surface as a one-tap secondary filter (PO-wizard
// style funnel: System → Action → final item). Order = priority.
const ACTION_VERBS = ['Demo', 'Reframe', 'Frame', 'Install', 'Replace', 'Repair', 'Add', 'Block', 'Sister', 'Patch'];

function detectAction(name: string): string | null {
  const first = name.trim().split(/\s+/)[0];
  if (!first) return null;
  const hit = ACTION_VERBS.find(v => v.toLowerCase() === first.toLowerCase());
  return hit ?? null;
}

type BrowseView = 'suggested' | 'divisions' | 'categories' | 'items';

export function ScopeCatalogBrowser({ state, dispatch }: ScopeCatalogBrowserProps) {
  const cur = state.items[state.currentItemIndex];
  const { divisions, search, filterByContext, isLoading } = useScopeCatalog();

  const [view, setView] = useState<BrowseView>('suggested');
  const [activeDivision, setActiveDivision] = useState<CatalogDivision | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  // Map the chosen System (wall/floor/roof/...) to the matching catalog zone.
  // System wins over location-derived zone, because "Main Floor + Wall System"
  // means walls on the main floor — not floor work.
  const SYSTEM_TO_ZONE: Record<string, import('@/types/catalog').Zone> = {
    wall: 'interior_wall',
    floor: 'interior_floor',
    ceiling: 'interior_ceiling',
    roof: 'roof',
    exterior: 'exterior_wall',
    openings: 'envelope_opening',
    deck: 'deck',
    stair: 'stairs',
    // 'other' → no zone override
  };

  const zone = useMemo(() => {
    if (cur.system && SYSTEM_TO_ZONE[cur.system]) return SYSTEM_TO_ZONE[cur.system];
    const tag = cur.locations.join(' · ');
    return resolveZoneFromLocationTag(tag);
  }, [cur.locations, cur.system]);

  const filterCtx: FilterContext = useMemo(() => ({
    zone,
    reason: cur.reason ?? null,
    workType: null,
    system: cur.system ?? null,
  }), [zone, cur.reason, cur.system]);

  const filtered = useMemo(() => filterByContext(filterCtx), [filterByContext, filterCtx]);

  // ── PO-wizard-style funnel ────────────────────────────────────────
  // The seeded catalog has applicable_zone='any' on every item, so
  // filterByContext.primary effectively returns the whole catalog. We
  // narrow client-side by the System chosen in Step 1, mapping system →
  // catalog categories. Anything outside the system bucket falls to
  // "Related" (collapsed) so users see ~5-15 truly relevant items.
  const systemBuckets = useMemo(() => {
    const allowed = cur.system ? SYSTEM_TO_CATEGORIES[cur.system] : null;
    if (!allowed || allowed.length === 0) {
      return { onSystem: filtered.primary, offSystem: filtered.secondary };
    }
    const onSystem: ScopeCatalogItem[] = [];
    const offSystem: ScopeCatalogItem[] = [];
    for (const it of filtered.primary) {
      if (allowed.includes(it.category_id)) onSystem.push(it);
      else offSystem.push(it);
    }
    // Pull genuinely-related items from secondary too (matches system).
    for (const it of filtered.secondary) {
      if (allowed.includes(it.category_id)) onSystem.push(it);
    }
    return { onSystem, offSystem };
  }, [filtered, cur.system]);

  // Detect which action verbs appear in the on-system items — surface
  // them as one-tap pills (PO wizard's filter funnel).
  const availableActions = useMemo(() => {
    const tally = new Map<string, number>();
    for (const it of systemBuckets.onSystem) {
      const v = detectAction(it.item_name);
      if (v) tally.set(v, (tally.get(v) ?? 0) + 1);
    }
    return ACTION_VERBS
      .filter(v => tally.has(v))
      .map(v => ({ verb: v, count: tally.get(v)! }));
  }, [systemBuckets.onSystem]);

  const visibleOnSystem = useMemo(() => {
    if (!actionFilter) return systemBuckets.onSystem;
    return systemBuckets.onSystem.filter(it => detectAction(it.item_name) === actionFilter);
  }, [systemBuckets.onSystem, actionFilter]);

  const searchResults = useMemo(() => {
    if (query.length < 2) return [];
    return search(query);
  }, [query, search]);

  const isSelected = (itemId: string) => cur.workTypes.has(itemId);

  const toggleItem = (item: ScopeCatalogItem) => {
    dispatch({
      type: 'TOGGLE_WORK_TYPE',
      workTypeId: item.id,
      workTypeName: item.item_name,
    });
  };

  const renderItem = (item: ScopeCatalogItem & { path?: string }) => {
    const selected = isSelected(item.id);
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => toggleItem(item)}
        className={cn(
          'flex items-start gap-2.5 p-3 rounded-xl border-[1.5px] text-left transition-all relative w-full',
          selected
            ? 'bg-amber-50 border-amber-400'
            : 'bg-background border-border hover:border-amber-300',
        )}
      >
        <span className={cn(
          'w-5 h-5 rounded-md border-[1.5px] flex items-center justify-center text-[0.75rem] font-bold shrink-0 mt-0.5 transition-all',
          selected ? 'bg-amber-500 border-amber-500 text-white' : 'bg-background border-muted-foreground/40 text-transparent',
        )}>
          ✓
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[0.82rem] font-semibold text-foreground leading-tight">
            {item.item_name}
          </p>
          <p className="text-[0.6rem] text-muted-foreground mt-0.5">
            {item.path ?? `${item.category_name} · ${item.unit}`}
          </p>
        </div>
      </button>
    );
  };

  // Active category items for drill-down
  const categoryItems = useMemo(() => {
    if (!activeDivision || !activeCategoryId) return [];
    const cat = activeDivision.categories.find(c => c.category_id === activeCategoryId);
    if (!cat) return [];
    return cat.groups.flatMap(g => g.items);
  }, [activeDivision, activeCategoryId]);

  if (isLoading) {
    return <p className="text-[0.78rem] text-muted-foreground py-6 text-center">Loading catalog…</p>;
  }

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search all catalog items…"
          className="w-full pl-9 pr-8 py-2 rounded-lg border bg-background text-[0.82rem] placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-400 transition-colors"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Search results */}
      {query.length >= 2 ? (
        <div className="space-y-1.5">
          {searchResults.length === 0 ? (
            <p className="text-[0.78rem] text-muted-foreground text-center py-4">No items match "{query}"</p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
              {searchResults.map(renderItem)}
            </div>
          )}
        </div>
      ) : view === 'suggested' ? (
        /* ── Funnel: System → Action → item ───────────── */
        <div>
          {!cur.system ? (
            <div className="p-5 rounded-xl border-[1.5px] border-dashed border-amber-300 bg-amber-50/40 text-center">
              <p className="text-[0.82rem] font-semibold text-amber-900">
                Pick a System in Step 1 first.
              </p>
              <p className="text-[0.7rem] text-amber-800/80 mt-1">
                We use it to narrow the catalog so you don't have to read 120+ items.
              </p>
            </div>
          ) : (
            <>
              {/* Action funnel pills */}
              {availableActions.length > 0 && (
                <div className="mb-3">
                  <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[1.2px] mb-2">
                    Narrow by action
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setActionFilter(null)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[0.72rem] font-semibold border transition-all',
                        actionFilter === null
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-background text-muted-foreground border-border hover:border-amber-300',
                      )}
                    >
                      All <span className="opacity-60 ml-1">{systemBuckets.onSystem.length}</span>
                    </button>
                    {availableActions.map(a => (
                      <button
                        key={a.verb}
                        type="button"
                        onClick={() => setActionFilter(a.verb === actionFilter ? null : a.verb)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[0.72rem] font-semibold border transition-all',
                          actionFilter === a.verb
                            ? 'bg-amber-500 text-white border-amber-500'
                            : 'bg-background text-muted-foreground border-border hover:border-amber-300',
                        )}
                      >
                        {a.verb} <span className="opacity-60 ml-1">{a.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {visibleOnSystem.length > 0 ? (
                <div className="mb-4">
                  <p className="text-[0.7rem] font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                    <span className="text-[0.55rem] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-[0.5px]">★ For your {cur.systemName ?? cur.system}</span>
                    <span className="text-[0.6rem] text-muted-foreground">{visibleOnSystem.length} items</span>
                  </p>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
                    {visibleOnSystem.map(renderItem)}
                  </div>
                </div>
              ) : (
                <div className="mb-4 p-4 rounded-xl border-[1.5px] border-dashed border-muted-foreground/30 text-center">
                  <p className="text-[0.78rem] text-muted-foreground">
                    No catalog items match {actionFilter ? `"${actionFilter}" in ` : ''}this system.
                  </p>
                  {actionFilter && (
                    <button
                      type="button"
                      onClick={() => setActionFilter(null)}
                      className="mt-2 text-[0.72rem] font-semibold text-amber-700 hover:underline"
                    >
                      Clear action filter
                    </button>
                  )}
                </div>
              )}

              {/* Demoted: subtle text links instead of giant CTA */}
              <div className="flex items-center justify-center gap-4 text-[0.7rem] text-muted-foreground mt-4 pt-3 border-t border-dashed">
                <span>Can't find it?</span>
                <button
                  type="button"
                  onClick={() => document.querySelector<HTMLInputElement>('input[placeholder^="Search"]')?.focus()}
                  className="font-semibold text-foreground hover:text-amber-700 transition-colors"
                >
                  Search catalog
                </button>
                <span className="opacity-30">·</span>
                <button
                  type="button"
                  onClick={() => setView('divisions')}
                  className="font-semibold text-foreground hover:text-amber-700 transition-colors inline-flex items-center gap-1"
                >
                  Browse all {filtered.primary.length + filtered.secondary.length} <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
        </div>
      ) : view === 'divisions' ? (
        /* ── Division list ─────────────────────────────── */
        <div>
          <button
            type="button"
            onClick={() => setView('suggested')}
            className="flex items-center gap-1 text-[0.72rem] font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Suggested
          </button>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {divisions.map(div => (
              <button
                key={div.division}
                type="button"
                onClick={() => { setActiveDivision(div); setView('categories'); }}
                className="flex items-center gap-3 p-3 rounded-xl border-[1.5px] bg-background border-border hover:border-amber-300 text-left transition-all"
              >
                <span className="text-lg">{div.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.82rem] font-semibold text-foreground">{div.label}</p>
                  <p className="text-[0.6rem] text-muted-foreground">{div.itemCount} items</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      ) : view === 'categories' && activeDivision ? (
        /* ── Category list within a division ───────────── */
        <div>
          <button
            type="button"
            onClick={() => { setActiveDivision(null); setView('divisions'); }}
            className="flex items-center gap-1 text-[0.72rem] font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> {activeDivision.label}
          </button>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
            {activeDivision.categories.map(cat => (
              <button
                key={cat.category_id}
                type="button"
                onClick={() => { setActiveCategoryId(cat.category_id); setView('items'); }}
                className="flex items-center gap-3 p-3 rounded-xl border-[1.5px] bg-background border-border hover:border-amber-300 text-left transition-all"
              >
                <span className="text-sm">{activeDivision.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[0.82rem] font-semibold text-foreground">{cat.category_name}</p>
                  <p className="text-[0.6rem] text-muted-foreground">{cat.itemCount} items</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      ) : view === 'items' && activeDivision ? (
        /* ── Items in a category ───────────────────────── */
        <div>
          <button
            type="button"
            onClick={() => { setActiveCategoryId(null); setView('categories'); }}
            className="flex items-center gap-1 text-[0.72rem] font-semibold text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
            {categoryItems.map(renderItem)}
          </div>
          {categoryItems.length === 0 && (
            <p className="text-[0.78rem] text-muted-foreground text-center py-4">No items in this category</p>
          )}
        </div>
      ) : null}

      {/* Selected count pill */}
      {cur.workTypes.size > 0 && (
        <div className="mt-3 flex items-center gap-2 text-[0.72rem] text-amber-700 font-semibold">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300">
            {cur.workTypes.size} selected
          </span>
        </div>
      )}
    </div>
  );
}
