import { useState, useMemo, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Search, X, ChevronRight } from 'lucide-react';
import { useWorkOrderCatalog } from '@/hooks/useWorkOrderCatalog';
import type { CatalogItem } from '@/types/quickLog';
import { DIVISION_LABELS } from '@/types/quickLog';
import type { UnifiedWizardData } from '@/types/unifiedWizard';

type DrillLevel = 'division' | 'category' | 'group' | 'item';

interface ScopeStepProps {
  data: UnifiedWizardData;
  onChange: (updates: Partial<UnifiedWizardData>) => void;
}

// Bug #6: Wrap with forwardRef for Radix UI compatibility
export const ScopeStep = forwardRef<HTMLDivElement, ScopeStepProps>(function ScopeStep({ data, onChange }, ref) {
  const catalog = useWorkOrderCatalog();
  const [searchQuery, setSearchQuery] = useState('');
  const [level, setLevel] = useState<DrillLevel>('division');
  const [activeDivision, setActiveDivision] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const selectedIds = useMemo(
    () => new Set(data.selectedCatalogItems.map(i => i.id)),
    [data.selectedCatalogItems]
  );

  const searchResults = useMemo(() => catalog.search(searchQuery), [catalog, searchQuery]);

  const toggleItem = (item: CatalogItem) => {
    const exists = selectedIds.has(item.id);
    const updated = exists
      ? data.selectedCatalogItems.filter(i => i.id !== item.id)
      : [...data.selectedCatalogItems, item];
    onChange({ selectedCatalogItems: updated });
  };

  const removeItem = (id: string) => {
    onChange({ selectedCatalogItems: data.selectedCatalogItems.filter(i => i.id !== id) });
  };

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const crumbs: { label: string; onClick: () => void }[] = [
      { label: 'All trades', onClick: () => { setLevel('division'); setActiveDivision(null); setActiveCategory(null); setActiveGroup(null); } },
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

  // Count selected items per category for badges
  const selectedByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data.selectedCatalogItems) {
      map.set(item.category_id, (map.get(item.category_id) || 0) + 1);
    }
    return map;
  }, [data.selectedCatalogItems]);

  const renderCheckbox = (isSelected: boolean) => (
    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
      isSelected ? 'border-amber-500 bg-amber-500' : 'border-muted-foreground/40'
    }`}>
      {isSelected && (
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );

  return (
    <div ref={ref} className="space-y-4">
      {/* Title (Full Scope only) */}
      {data.wo_mode === 'full_scope' && (
        <div>
          <label className="text-sm font-medium text-foreground">Work order title</label>
          <Input
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Enter a descriptive title"
            className="mt-1"
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search all tasks…"
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
        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
          {breadcrumbs.map((bc, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground/50">›</span>}
              <button onClick={bc.onClick} className="hover:text-foreground transition-colors">
                {bc.label}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Catalog drill-down / search results */}
      <div className="rounded-lg border border-border bg-card max-h-[320px] overflow-y-auto">
        {searchQuery ? (
          <div className="p-2 space-y-0.5">
            {searchResults.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No items found</p>
            ) : (
              searchResults.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                      isSelected ? 'bg-amber-50 dark:bg-amber-900/20' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-medium">{item.item_name}</p>
                      <p className="text-xs text-muted-foreground">{item.path}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-mono">{item.unit}</span>
                      {renderCheckbox(isSelected)}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className="p-2">
            {/* Level 1: Divisions */}
            {level === 'division' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {catalog.divisions.map((div) => {
                  const firstCat = div.categories[0];
                  return (
                    <button
                      key={div.division}
                      onClick={() => { setActiveDivision(div.division); setLevel('category'); }}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/50 transition-colors"
                    >
                      <span
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: firstCat?.category_bg, color: firstCat?.category_color }}
                      >
                        {firstCat?.category_icon || '•'}
                      </span>
                      <span className="text-[13px] font-medium text-center" style={{ color: firstCat?.category_color }}>
                        {div.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{div.itemCount} tasks</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Level 2: Categories */}
            {level === 'category' && currentDivision && (
              <div className="space-y-0.5">
                {currentDivision.categories.map((cat) => {
                  const selCount = selectedByCategory.get(cat.category_id) || 0;
                  return (
                    <button
                      key={cat.category_id}
                      onClick={() => { setActiveCategory(cat.category_id); setLevel('group'); }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span
                        className="w-8 h-8 rounded-md flex items-center justify-center text-sm shrink-0"
                        style={{ backgroundColor: cat.category_bg, color: cat.category_color }}
                      >
                        {cat.category_icon}
                      </span>
                      <div className="flex-1 text-left">
                        <p className="text-[13px] font-medium">{cat.category_name}</p>
                        <p className="text-[11px] text-muted-foreground">{cat.groups.length} types · {cat.itemCount} tasks</p>
                      </div>
                      {selCount > 0 && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cat.category_bg, color: cat.category_color }}>
                          {selCount} selected
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Level 3: Sub-groups */}
            {level === 'group' && currentCategory && (
              <div className="grid grid-cols-2 gap-2">
                {currentCategory.groups.map((grp) => {
                  const hasSelected = grp.items.some(i => selectedIds.has(i.id));
                  return (
                    <button
                      key={grp.group_id}
                      onClick={() => { setActiveGroup(grp.group_id); setLevel('item'); }}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-colors ${
                        hasSelected
                          ? 'border-current'
                          : 'border-border hover:border-primary/40'
                      } hover:bg-muted/50`}
                      style={hasSelected ? { borderColor: currentCategory.category_color, backgroundColor: currentCategory.category_bg + '40' } : {}}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: currentCategory.category_color }}
                      />
                      <div>
                        <p className="text-[13px] font-medium">{grp.group_label}</p>
                        <p className="text-[11px] text-muted-foreground">{grp.items.length} tasks</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Level 4: Items */}
            {level === 'item' && currentGroup && (
              <div className="space-y-0.5">
                {currentGroup.items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item)}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-lg transition-colors ${
                        isSelected ? 'bg-amber-50 dark:bg-amber-900/20' : 'hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {renderCheckbox(isSelected)}
                        <span className="text-[13px]">{item.item_name}</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">{item.unit}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected items tray */}
      {data.selectedCatalogItems.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-1.5">
            {data.selectedCatalogItems.length} selected
          </p>
          <div className="flex flex-wrap gap-1.5">
            {data.selectedCatalogItems.map((item) => (
              <span
                key={item.id}
                className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-2 py-1 rounded-full"
              >
                {item.item_name}
                <button onClick={() => removeItem(item.id)} className="hover:text-amber-600">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Scope description */}
      <div>
        <label className="text-sm font-medium text-foreground">Scope description</label>
        <Textarea
          value={data.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder={data.wo_mode === 'quick_capture'
            ? data.selectedCatalogItems.map(i => i.item_name).join(', ') || 'Optional description…'
            : 'Describe the scope of work…'
          }
          className="mt-1 min-h-[80px]"
          rows={3}
        />
      </div>
    </div>
  );
});
