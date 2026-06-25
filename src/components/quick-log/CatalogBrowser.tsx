import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, X, ChevronRight } from 'lucide-react';
import type { CatalogItem } from '@/types/quickLog';
import { DIVISION_LABELS } from '@/types/quickLog';
// CatalogBrowser expects a catalog prop with divisions, search method

type DrillLevel = 'division' | 'category' | 'group' | 'item';

interface CatalogBrowserProps {
  catalog: any;
  selectedItemId: string | null;
  onSelect: (item: CatalogItem | null) => void;
  compact?: boolean;
}

export function CatalogBrowser({ catalog, selectedItemId, onSelect, compact }: CatalogBrowserProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [level, setLevel] = useState<DrillLevel>('division');
  const [activeDivision, setActiveDivision] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const searchResults = useMemo(() => catalog.search(searchQuery), [catalog, searchQuery]);

  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; onClick: () => void }[] = [
      { label: 'All', onClick: () => { setLevel('division'); setActiveDivision(null); setActiveCategory(null); setActiveGroup(null); } },
    ];
    if (activeDivision) {
      crumbs.push({
        label: DIVISION_LABELS[activeDivision] || activeDivision,
        onClick: () => { setLevel('category'); setActiveCategory(null); setActiveGroup(null); },
      });
    }
    if (activeCategory) {
      const cat = catalog.divisions.find(d => d.division === activeDivision)?.categories.find(c => c.category_id === activeCategory);
      if (cat) crumbs.push({
        label: cat.category_name,
        onClick: () => { setLevel('group'); setActiveGroup(null); },
      });
    }
    if (activeGroup) {
      const cat = catalog.divisions.find(d => d.division === activeDivision)?.categories.find(c => c.category_id === activeCategory);
      const grp = cat?.groups.find(g => g.group_id === activeGroup);
      if (grp) crumbs.push({ label: grp.group_label, onClick: () => {} });
    }
    return crumbs;
  }, [level, activeDivision, activeCategory, activeGroup, catalog.divisions]);

  const currentDivision = catalog.divisions.find(d => d.division === activeDivision);
  const currentCategory = currentDivision?.categories.find(c => c.category_id === activeCategory);
  const currentGroup = currentCategory?.groups.find(g => g.group_id === activeGroup);

  return (
    <Card>
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Breadcrumb */}
        {!searchQuery && level !== 'division' && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3 flex-wrap">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <button onClick={bc.onClick} className="hover:text-foreground transition-colors">
                  {bc.label}
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search results */}
        {searchQuery ? (
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No items found</p>
            ) : (
              searchResults.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect(selectedItemId === item.id ? null : item)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                    selectedItemId === item.id
                      ? 'bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700'
                      : 'hover:bg-muted'
                  }`}
                >
                  <p className="text-sm font-medium">{item.item_name}</p>
                  <p className="text-xs text-muted-foreground">{item.path}</p>
                </button>
              ))
            )}
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {/* Level 1: Divisions */}
            {level === 'division' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {catalog.divisions.map((div) => {
                  const firstCat = div.categories[0];
                  return (
                    <button
                      key={div.division}
                      onClick={() => { setActiveDivision(div.division); setLevel('category'); }}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted transition-colors"
                    >
                      <span
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: firstCat?.category_bg, color: firstCat?.category_color }}
                      >
                        {firstCat?.category_icon || '•'}
                      </span>
                      <span className="text-sm font-medium text-center">{div.label}</span>
                      <span className="text-xs text-muted-foreground">{div.itemCount} tasks</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Level 2: Categories */}
            {level === 'category' && currentDivision && (
              <div className="space-y-1">
                {currentDivision.categories.map((cat) => (
                  <button
                    key={cat.category_id}
                    onClick={() => { setActiveCategory(cat.category_id); setLevel('group'); }}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <span
                      className="w-8 h-8 rounded-md flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: cat.category_bg, color: cat.category_color }}
                    >
                      {cat.category_icon}
                    </span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{cat.category_name}</p>
                      <p className="text-xs text-muted-foreground">{cat.groups.length} groups · {cat.itemCount} tasks</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {/* Level 3: Sub-groups */}
            {level === 'group' && currentCategory && (
              <div className="grid grid-cols-2 gap-2">
                {currentCategory.groups.map((grp) => (
                  <button
                    key={grp.group_id}
                    onClick={() => { setActiveGroup(grp.group_id); setLevel('item'); }}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted transition-colors text-left"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: currentCategory.category_color }}
                    />
                    <div>
                      <p className="text-sm font-medium">{grp.group_label}</p>
                      <p className="text-xs text-muted-foreground">{grp.items.length} tasks</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Level 4: Items */}
            {level === 'item' && currentGroup && (
              <div className="space-y-1">
                {currentGroup.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onSelect(selectedItemId === item.id ? null : item)}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${
                      selectedItemId === item.id
                        ? 'bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          selectedItemId === item.id ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/40'
                        }`}
                      >
                        {selectedItemId === item.id && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm">{item.item_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">{item.unit}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
