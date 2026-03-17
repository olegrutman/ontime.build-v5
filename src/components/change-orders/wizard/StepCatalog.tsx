import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, X, ChevronRight } from 'lucide-react';
import { useWorkOrderCatalog } from '@/hooks/useWorkOrderCatalog';
import type { WorkOrderCatalogItem } from '@/types/changeOrder';
import type { COWizardData } from './COWizard';

interface StepCatalogProps {
  data:     COWizardData;
  onChange: (patch: Partial<COWizardData>) => void;
}

type DrillLevel = 'division' | 'category' | 'group' | 'item';

export function StepCatalog({ data, onChange }: StepCatalogProps) {
  const { divisions, search, isLoading } = useWorkOrderCatalog();
  const [query,          setQuery]          = useState('');
  const [level,          setLevel]          = useState<DrillLevel>('division');
  const [activeDivision, setActiveDivision] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeGroup,    setActiveGroup]    = useState<string | null>(null);

  const selectedIds = useMemo(
    () => new Set(data.selectedItems.map(i => i.id)),
    [data.selectedItems]
  );

  const searchResults = useMemo(
    () => search(query),
    [query, search]
  );

  function toggleItem(item: WorkOrderCatalogItem) {
    const exists = selectedIds.has(item.id);
    const updated = exists
      ? data.selectedItems.filter(i => i.id !== item.id)
      : [...data.selectedItems, item];
    onChange({
      selectedItems:    updated,
      scopeDescription: data.scopeDescription || updated.map(i => i.item_name).join(', '),
    });
  }

  function removeItem(id: string) {
    const updated = data.selectedItems.filter(i => i.id !== id);
    onChange({ selectedItems: updated });
  }

  function navTo(
    nextLevel:   DrillLevel,
    division?:   string,
    category?:   string,
    group?:      string,
  ) {
    setLevel(nextLevel);
    setActiveDivision(division ?? null);
    setActiveCategory(category ?? null);
    setActiveGroup(group ?? null);
  }

  const currentDiv = divisions.find(d => d.division === activeDivision);
  const currentCat = currentDiv?.categories.find(c => c.category_id === activeCategory);
  const currentGrp = currentCat?.groups.find(g => g.group_id === activeGroup);

  const selectedByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data.selectedItems) {
      map.set(item.category_id, (map.get(item.category_id) ?? 0) + 1);
    }
    return map;
  }, [data.selectedItems]);

  function Checkbox({ selected }: { selected: boolean }) {
    return (
      <span
        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          selected
            ? 'bg-primary border-primary'
            : 'border-border bg-card'
        }`}
      >
        {selected && (
          <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary-foreground">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        )}
      </span>
    );
  }

  function Breadcrumb() {
    const crumbs: { label: string; onClick: () => void }[] = [
      { label: 'All trades', onClick: () => navTo('division') },
    ];
    if (activeDivision) {
      crumbs.push({
        label:   currentDiv?.label ?? activeDivision,
        onClick: () => navTo('category', activeDivision),
      });
    }
    if (activeCategory) {
      crumbs.push({
        label:   currentCat?.category_name ?? activeCategory,
        onClick: () => navTo('group', activeDivision!, activeCategory),
      });
    }
    if (activeGroup) {
      crumbs.push({
        label:   currentGrp?.group_label ?? activeGroup,
        onClick: () => {},
      });
    }
    if (crumbs.length <= 1) return null;
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span>›</span>}
            <button
              onClick={c.onClick}
              className="hover:text-foreground transition-colors"
            >
              {c.label}
            </button>
          </span>
        ))}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        Loading catalog…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search catalog items…"
          className="pl-9 pr-9"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!query && <Breadcrumb />}

      {/* Browse / search results */}
      <div className="border rounded-lg overflow-hidden">
        {query ? (
          <div className="divide-y">
            {searchResults.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground text-center">No results</p>
            ) : searchResults.slice(0, 50).map(item => {
              const sel = selectedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 ${sel ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                >
                  <Checkbox selected={sel} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.path}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{item.unit}</span>
                </button>
              );
            })}
          </div>
        ) : level === 'division' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3">
            {divisions.map(div => {
              const firstCat = div.categories[0];
              return (
                <button
                  key={div.division}
                  onClick={() => navTo('category', div.division)}
                  className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors"
                >
                  <span className="text-2xl">
                    {firstCat?.category_icon ?? '•'}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {div.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{div.itemCount} items</span>
                </button>
              );
            })}
          </div>
        ) : level === 'category' && currentDiv ? (
          <div className="divide-y">
            {currentDiv.categories.map(cat => {
              const selCount = selectedByCategory.get(cat.category_id) ?? 0;
              return (
                <button
                  key={cat.category_id}
                  onClick={() => navTo('group', activeDivision!, cat.category_id)}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/40 transition-colors"
                >
                  <span className="text-lg shrink-0">
                    {cat.category_icon}
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium">{cat.category_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {cat.groups.length} groups · {cat.itemCount} items
                    </p>
                  </div>
                  {selCount > 0 && (
                    <span className="text-xs font-medium text-primary shrink-0">
                      {selCount} selected
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        ) : level === 'group' && currentCat ? (
          <div className="grid grid-cols-2 gap-2 p-3">
            {currentCat.groups.map(grp => {
              const hasSelected = grp.items.some(i => selectedIds.has(i.id));
              return (
                <button
                  key={grp.group_id}
                  onClick={() => navTo('item', activeDivision!, activeCategory!, grp.group_id)}
                  className="flex items-start gap-2 p-3 rounded-lg border text-left transition-colors hover:bg-muted/40"
                  style={hasSelected ? {
                    borderColor: currentCat.category_color,
                    background: currentCat.category_bg + '33',
                  } : {}}
                >
                  <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{grp.group_label}</p>
                    <p className="text-xs text-muted-foreground">{grp.items.length} items</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : level === 'item' && currentGrp ? (
          <div className="divide-y">
            {currentGrp.items.map(item => {
              const sel = selectedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 ${sel ? 'bg-amber-50 dark:bg-amber-950/20' : ''}`}
                >
                  <Checkbox selected={sel} />
                  <span className="text-sm flex-1">{item.item_name}</span>
                  <span className="text-xs text-muted-foreground">{item.unit}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Selected chips */}
      {data.selectedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {data.selectedItems.length} selected
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.selectedItems.map(item => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                {item.item_name}
                <button
                  onClick={() => removeItem(item.id)}
                  className="hover:text-primary/70 ml-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Scope description */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Scope description
        </label>
        <Textarea
          value={data.scopeDescription}
          onChange={(e) => onChange({ scopeDescription: e.target.value })}
          placeholder={
            data.selectedItems.length > 0
              ? data.selectedItems.map(i => i.item_name).join(', ')
              : 'Describe the scope of work…'
          }
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
}
