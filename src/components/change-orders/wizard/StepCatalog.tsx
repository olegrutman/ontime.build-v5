import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronRight, MapPin, Plus, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScopeCatalog } from '@/hooks/useScopeCatalog';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { ScopeCatalogItem, COReasonCode } from '@/types/changeOrder';
import type { COWizardData, SelectedScopeItem } from './COWizard';
import { VisualLocationPicker } from '../VisualLocationPicker';

interface StepCatalogProps {
  data: COWizardData;
  onChange: (patch: Partial<COWizardData>) => void;
  projectId: string;
  workType?: string;
}

// Maps work-type keys to catalog division slugs
const WORK_TYPE_DIVISION_MAP: Record<string, string> = {
  framing: 'framing',
  reframing: 'framing',
  sheathing: 'framing',
  blocking: 'framing',
  exterior: 'exterior',
  stairs: 'framing',
};

const WORK_TYPE_LABELS: Record<string, string> = {
  framing: 'Framing',
  reframing: 'Reframing',
  sheathing: 'Sheathing',
  blocking: 'Blocking',
  exterior: 'Exterior Scope',
  stairs: 'Stairs',
};

type DrillLevel = 'division' | 'category' | 'group' | 'item';
type Phase = 'location' | 'reason' | 'items';

const REASONS: { code: COReasonCode; description: string }[] = [
  { code: 'addition',          description: 'New scope not in the original contract' },
  { code: 'rework',            description: 'Something built wrong that needs to be redone' },
  { code: 'design_change',     description: 'Plans or drawings changed after work started' },
  { code: 'owner_request',     description: 'Owner asked for something different' },
  { code: 'gc_request',        description: 'GC directed the change' },
  { code: 'damaged_by_others', description: 'Another trade or party caused the damage' },
  { code: 'other',             description: 'Anything else' },
];

export function StepCatalog({ data, onChange, projectId, workType }: StepCatalogProps) {
  const { divisions, search, isLoading } = useScopeCatalog();

  // Resolve work type → division auto-filter
  const mappedDivision = workType ? WORK_TYPE_DIVISION_MAP[workType] ?? null : null;
  const workTypeLabel = workType ? WORK_TYPE_LABELS[workType] ?? workType : null;

  // When location & reason are pre-set by the wizard, lock them (read-only pills)
  const [lockedFromWizard] = useState(() => !!(data.locationTag && data.reason));

  // Internal phase: location → reason → items
  const [phase, setPhase] = useState<Phase>(() => {
    if (data.locationTag && data.reason) return 'items';
    if (data.locationTag) return 'reason';
    return 'location';
  });

  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<DrillLevel>(() => mappedDivision ? 'category' : 'division');
  const [activeDivision, setActiveDivision] = useState<string | null>(mappedDivision);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [isFiltered, setIsFiltered] = useState(!!mappedDivision);

  const selectedIds = useMemo(() => new Set(data.selectedItems.map(i => i.id)), [data.selectedItems]);
  // Prioritize search results: matching division first, then others
  const searchResults = useMemo(() => {
    const results = search(query);
    if (!mappedDivision || !query) return results;
    const inDiv: typeof results = [];
    const rest: typeof results = [];
    for (const r of results) {
      if (r.division?.toLowerCase() === mappedDivision) inDiv.push(r);
      else rest.push(r);
    }
    return [...inDiv, ...rest];
  }, [query, search, mappedDivision]);

  // Saved location from localStorage for shortcut
  const savedLocationKey = `co_wizard_last_location_${projectId}`;
  const savedLocation = typeof window !== 'undefined' ? localStorage.getItem(savedLocationKey) : null;

  function handleLocationConfirm(tag: string) {
    onChange({ locationTag: tag });
    if (typeof window !== 'undefined') {
      localStorage.setItem(savedLocationKey, tag);
    }
    setPhase('reason');
  }

  function handleReasonSelect(code: COReasonCode) {
    onChange({ reason: code });
    setPhase('items');
  }

  function selectItem(item: ScopeCatalogItem) {
    if (selectedIds.has(item.id)) {
      onChange({ selectedItems: data.selectedItems.filter(i => i.id !== item.id) });
      return;
    }
    const newItem: SelectedScopeItem = {
      ...item,
      locationTag: data.locationTag,
      reason: data.reason!,
      reasonDescription: '',
    };
    onChange({
      selectedItems: [...data.selectedItems, newItem],
    });
  }

  function removeItem(id: string) {
    onChange({ selectedItems: data.selectedItems.filter(i => i.id !== id) });
  }

  function navTo(nextLevel: DrillLevel, division?: string, category?: string, group?: string) {
    setLevel(nextLevel);
    setActiveDivision(division ?? null);
    setActiveCategory(category ?? null);
    setActiveGroup(group ?? null);
  }

  const currentDiv = divisions.find(d => d.division === activeDivision);
  const currentCat = currentDiv?.categories.find(c => c.category_id === activeCategory);
  const currentGrp = currentCat?.groups.find(g => g.group_id === activeGroup);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading catalog…</div>;
  }

  // ── PHASE 1: LOCATION ──
  if (phase === 'location') {
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Where is the work?</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Pick the location for this change order</p>
        </div>
        <VisualLocationPicker
          projectId={projectId}
          onConfirm={handleLocationConfirm}
          savedLocation={savedLocation}
          compact
        />
      </div>
    );
  }

  // ── PHASE 2: REASON ──
  if (phase === 'reason') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPhase('location')} className="h-7 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold text-foreground">Why is this needed?</h4>
            <p className="text-xs text-muted-foreground">Select the reason for this change order</p>
          </div>
        </div>

        {/* Location summary pill */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="text-sm font-medium">{data.locationTag}</span>
          <button onClick={() => setPhase('location')} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Change</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {REASONS.map(({ code, description }) => {
            const colors = CO_REASON_COLORS[code];
            return (
              <button
                key={code}
                onClick={() => handleReasonSelect(code)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all w-full',
                  'border-border hover:border-primary/30 hover:bg-muted/40'
                )}
              >
                <span
                  className="inline-block px-2 py-0.5 rounded text-xs font-semibold shrink-0 mt-0.5"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {CO_REASON_LABELS[code]}
                </span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── PHASE 3: ITEMS (CATALOG BROWSER) ──
  return (
    <div className="space-y-4">
      {/* CO-level location + reason summary */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-medium">
          <MapPin className="h-3 w-3" />
          {data.locationTag}
          {!lockedFromWizard && (
            <button onClick={() => setPhase('location')} className="ml-1 text-muted-foreground hover:text-foreground">✕</button>
          )}
        </div>
        {data.reason && CO_REASON_COLORS[data.reason] && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: CO_REASON_COLORS[data.reason].bg, color: CO_REASON_COLORS[data.reason].text }}
          >
            {CO_REASON_LABELS[data.reason] ?? data.reason}
            {!lockedFromWizard && (
              <button onClick={() => setPhase('reason')} className="ml-1 opacity-60 hover:opacity-100">✕</button>
            )}
          </div>
        )}
      </div>

      {/* Smart filter banner */}
      {isFiltered && workTypeLabel && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent text-accent-foreground text-sm">
          <span>Showing scope for <strong>{workTypeLabel}</strong></span>
          <button
            onClick={() => {
              setIsFiltered(false);
              navTo('division');
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            Browse all trades →
          </button>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search catalog items…"
          className="pl-9 pr-9"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!query && level !== 'division' && (
        <Breadcrumb
          activeDivision={activeDivision}
          activeCategory={activeCategory}
          activeGroup={activeGroup}
          currentDiv={currentDiv}
          currentCat={currentCat}
          currentGrp={currentGrp}
          navTo={navTo}
        />
      )}

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
                  onClick={() => selectItem(item)}
                  className={cn('w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40', sel && 'bg-amber-50 dark:bg-amber-950/20')}
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
            {divisions.map(div => (
              <button
                key={div.division}
                onClick={() => navTo('category', div.division)}
                className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors"
              >
                <span className="text-2xl">{div.categories[0]?.category_icon ?? '•'}</span>
                <span className="text-sm font-medium text-foreground">{div.label}</span>
                <span className="text-xs text-muted-foreground">{div.itemCount} items</span>
              </button>
            ))}
          </div>
        ) : level === 'category' && currentDiv ? (
          <div className="divide-y">
            {currentDiv.categories.map(cat => (
              <button
                key={cat.category_id}
                onClick={() => navTo('group', activeDivision!, cat.category_id)}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-muted/40 transition-colors"
              >
                <span className="text-lg shrink-0">{cat.category_icon}</span>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium">{cat.category_name}</p>
                  <p className="text-xs text-muted-foreground">{cat.groups.length} groups · {cat.itemCount} items</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        ) : level === 'group' && currentCat ? (
          <div className="grid grid-cols-2 gap-2 p-3">
            {currentCat.groups.map(grp => (
              <button
                key={grp.group_id}
                onClick={() => navTo('item', activeDivision!, activeCategory!, grp.group_id)}
                className="flex items-start gap-2 p-3 rounded-lg border text-left transition-colors hover:bg-muted/40"
              >
                <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">{grp.group_label}</p>
                  <p className="text-xs text-muted-foreground">{grp.items.length} items</p>
                </div>
              </button>
            ))}
          </div>
        ) : level === 'item' && currentGrp ? (
          <div className="divide-y">
            {currentGrp.items.map(item => {
              const sel = selectedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={cn('w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40', sel && 'bg-amber-50 dark:bg-amber-950/20')}
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

      {/* Selected items */}
      {data.selectedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{data.selectedItems.length} selected</p>
          <div className="space-y-1.5">
            {data.selectedItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.item_name}</p>
                </div>
                <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Checkbox({ selected }: { selected: boolean }) {
  return (
    <span className={cn('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
      selected ? 'bg-primary border-primary' : 'border-border bg-card'
    )}>
      {selected && (
        <svg viewBox="0 0 12 12" className="w-3 h-3 text-primary-foreground">
          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" fill="none" />
        </svg>
      )}
    </span>
  );
}

function Breadcrumb({ activeDivision, activeCategory, activeGroup, currentDiv, currentCat, currentGrp, navTo }: any) {
  const crumbs: { label: string; onClick: () => void }[] = [
    { label: 'All trades', onClick: () => navTo('division') },
  ];
  if (activeDivision) crumbs.push({ label: currentDiv?.label ?? activeDivision, onClick: () => navTo('category', activeDivision) });
  if (activeCategory) crumbs.push({ label: currentCat?.category_name ?? activeCategory, onClick: () => navTo('group', activeDivision, activeCategory) });
  if (activeGroup) crumbs.push({ label: currentGrp?.group_label ?? activeGroup, onClick: () => {} });
  if (crumbs.length <= 1) return null;
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span>›</span>}
          <button onClick={c.onClick} className="hover:text-foreground transition-colors">{c.label}</button>
        </span>
      ))}
    </div>
  );
}
