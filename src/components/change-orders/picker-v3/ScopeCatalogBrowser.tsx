import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Search, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { useScopeCatalog, type CatalogDivision, type FilterContext } from '@/hooks/useScopeCatalog';
import { resolveZoneFromLocationTag } from '@/lib/resolveZone';
import type { ScopeCatalogItem } from '@/types/changeOrder';
import type { PickerState, PickerAction } from './types';

interface ScopeCatalogBrowserProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
}

type BrowseView = 'suggested' | 'divisions' | 'categories' | 'items';

export function ScopeCatalogBrowser({ state, dispatch }: ScopeCatalogBrowserProps) {
  const cur = state.items[state.currentItemIndex];
  const { divisions, search, filterByContext, isLoading } = useScopeCatalog();

  const [view, setView] = useState<BrowseView>('suggested');
  const [activeDivision, setActiveDivision] = useState<CatalogDivision | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // Resolve zone from current item's locations
  const zone = useMemo(() => {
    const tag = cur.locations.join(' · ');
    return resolveZoneFromLocationTag(tag);
  }, [cur.locations]);

  const filterCtx: FilterContext = useMemo(() => ({
    zone,
    reason: cur.reason ?? null,
    workType: null,
  }), [zone, cur.reason]);

  const filtered = useMemo(() => filterByContext(filterCtx), [filterByContext, filterCtx]);

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
        /* ── Suggested items ──────────────────────────── */
        <div>
          {filtered.primary.length > 0 && (
            <div className="mb-4">
              <p className="text-[0.7rem] font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                <span className="text-[0.55rem] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-[0.5px]">★ Suggested</span>
                <span className="text-[0.6rem] text-muted-foreground">{filtered.primary.length} items</span>
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
                {filtered.primary.map(renderItem)}
              </div>
            </div>
          )}

          {filtered.secondary.length > 0 && (
            <div className="mb-4">
              <p className="text-[0.7rem] font-semibold text-foreground/80 mb-2 flex items-center gap-2">
                <span className="text-[0.55rem] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-[0.5px]">Related</span>
                <span className="text-[0.6rem] text-muted-foreground">{filtered.secondary.length} items</span>
              </p>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2">
                {filtered.secondary.slice(0, 12).map(renderItem)}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setView('divisions')}
            className="flex items-center gap-2 w-full justify-center py-3 mt-2 rounded-lg border-[1.5px] border-dashed border-muted-foreground/30 text-[0.78rem] font-semibold text-muted-foreground hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 transition-all"
          >
            Browse Full Catalog <ChevronRight className="h-3.5 w-3.5" />
          </button>
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
