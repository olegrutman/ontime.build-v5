import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronRight, ChevronDown, MapPin, ArrowLeft, Sparkles, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useScopeCatalog } from '@/hooks/useScopeCatalog';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { ScopeCatalogItem, COReasonCode } from '@/types/changeOrder';
import type { COWizardData, SelectedScopeItem } from './COWizard';
import { VisualLocationPicker } from '../VisualLocationPicker';
import { resolveZoneFromLocationTag } from '@/lib/resolveZone';
import { StepCatalogModeSwitch, type ScopePickerMode } from './StepCatalogModeSwitch';
import { StepCatalogQA } from './StepCatalogQA';
import { StepCatalogTypeFallback } from './StepCatalogTypeFallback';
import type { SuggestResponse } from '@/hooks/useScopeSuggestions';

interface StepCatalogProps {
  data: COWizardData;
  onChange: (patch: Partial<COWizardData>) => void;
  projectId: string;
  workType?: string;
  /** Phase B — explicit intent from Step 1 picker. Drives Sasha's Q-flow. */
  intent?: import('@/types/scopeQA').WorkIntent | null;
}

const WORK_TYPE_LABELS: Record<string, string> = {
  framing: 'Framing',
  reframing: 'Reframing',
  sheathing: 'Sheathing',
  blocking: 'Blocking',
  exterior: 'Exterior Scope',
  stairs: 'Stairs',
  structural: 'Structural',
  wrb: 'WRB & Envelope',
  demo: 'Demo',
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

export function StepCatalog({ data, onChange, projectId, workType, intent }: StepCatalogProps) {
  const { divisions, search, filterByContext, isLoading } = useScopeCatalog();

  const workTypeLabel = workType ? WORK_TYPE_LABELS[workType] ?? workType : null;

  // When location & reason are pre-set by the wizard, lock them (read-only pills).
  // Inside the wizard both are guaranteed by canAdvance(), so phases collapse to 'items'.
  const lockedFromWizard = !!(data.locationTag && data.reason);

  // Internal phase: location → reason → items (legacy non-wizard usage only)
  const [phase, setPhase] = useState<Phase>(() => {
    if (data.locationTag && data.reason) return 'items';
    if (data.locationTag) return 'reason';
    return 'location';
  });

  const [query, setQuery] = useState('');
  const [showSecondary, setShowSecondary] = useState(false);
  const [showEverything, setShowEverything] = useState(false);
  const [level, setLevel] = useState<DrillLevel>('division');
  const [activeDivision, setActiveDivision] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // ── Phase 3: scope picker mode (qa | type | browse) ──
  const modeKey = `co_wizard_scope_mode_${projectId}`;
  const [mode, setMode] = useState<ScopePickerMode>(() => {
    if (typeof window === 'undefined') return 'qa';
    const saved = window.localStorage.getItem(modeKey);
    return (saved === 'browse' || saved === 'type' || saved === 'qa') ? saved : 'qa';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(modeKey, mode);
  }, [mode, modeKey]);

  // Phase 4 / type-mode: AI-suggested picks fed to a lightweight selector
  const [typeResults, setTypeResults] = useState<{ description: string; resp: SuggestResponse } | null>(null);
  const [typeSelected, setTypeSelected] = useState<Set<string>>(new Set());
  const [typeDraft, setTypeDraft] = useState('');

  const selectedIds = useMemo(() => new Set(data.selectedItems.map(i => i.id)), [data.selectedItems]);
  const searchResults = useMemo(() => search(query), [query, search]);

  // ── Phase 1 context-aware filtering ──
  const zone = useMemo(() => resolveZoneFromLocationTag(data.locationTag), [data.locationTag]);
  const filtered = useMemo(
    () => filterByContext({ zone, reason: data.reason ?? null, workType: workType ?? null }),
    [filterByContext, zone, data.reason, workType]
  );

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

  // ── Phase 3 helpers: complete from QA / type results ──
  function completeFromItems(items: SelectedScopeItem[], aiDescription: string, qaAnswers?: Record<string, string | string[]>) {
    const merged: Partial<COWizardData> = {
      selectedItems: items,
      aiDescription,
    };
    if (qaAnswers) (merged as any).qaAnswers = qaAnswers;
    onChange(merged);
  }

  function handleLocationRefine(newTag: string) {
    onChange({ locationTag: newTag });
  }

  function toggleTypePick(catalogId: string) {
    setTypeSelected(prev => {
      const next = new Set(prev);
      if (next.has(catalogId)) next.delete(catalogId);
      else next.add(catalogId);
      return next;
    });
  }

  function confirmTypePicks() {
    if (!typeResults) return;
    const items: SelectedScopeItem[] = typeResults.resp.picks
      .filter(p => typeSelected.has(p.catalog_id))
      .map(p => {
        const cat = (window as any).__scopeCatalogCache?.find?.((i: ScopeCatalogItem) => i.id === p.catalog_id);
        // Fallback to building a minimal SelectedScopeItem if cache miss — use suggestion fields
        const base: ScopeCatalogItem = cat ?? {
          id: p.catalog_id,
          division: '',
          category_id: '',
          category_name: '',
          group_id: '',
          group_label: '',
          item_name: p.name,
          unit: p.unit,
          category_color: '',
          category_bg: '',
          category_icon: '',
          sort_order: 0,
          org_id: null,
        };
        return {
          ...base,
          qty: p.suggested_quantity,
          quantity_source: p.suggested_quantity != null ? 'ai' : null,
          ai_confidence: p.suggested_quantity != null ? p.confidence : null,
          ai_reasoning: p.suggested_quantity != null ? p.reasoning : null,
          locationTag: data.locationTag,
          reason: data.reason!,
          reasonDescription: '',
        } as SelectedScopeItem;
      });
    completeFromItems(items, typeResults.description);
    toast.success(`Added ${items.length} item${items.length === 1 ? '' : 's'}`);
  }

  // ── PHASE 3: ITEMS (mode switch + tabs) ──
  return (
    <div className="space-y-4">
      {/* Locked context: location + reason + workType chips */}
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
        {workTypeLabel && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 text-xs font-semibold">
            {workTypeLabel}
          </div>
        )}
        {lockedFromWizard && (
          <span className="text-[10px] text-muted-foreground ml-auto">Edit in earlier steps</span>
        )}
      </div>

      {/* Mode switch */}
      <StepCatalogModeSwitch value={mode} onChange={(m) => { setMode(m); setTypeResults(null); setTypeSelected(new Set()); }} />

      {/* QA mode */}
      {mode === 'qa' && data.locationTag && data.reason && (
        <StepCatalogQA
          projectId={projectId}
          locationTag={data.locationTag}
          reason={data.reason}
          workType={workType ?? null}
          intent={intent ?? undefined}
          onComplete={({ description, answers, selectedItems }) => {
            if (selectedItems.length === 0) {
              toast.message('No automatic matches — try the manual catalog', { description: 'Switching to Browse mode.' });
              setMode('browse');
              return;
            }
            completeFromItems(selectedItems, description, answers);
            toast.success(`Added ${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'}`);
          }}
          onFallbackToType={(draft) => { setTypeDraft(draft); setMode('type'); }}
          onFallbackToBrowse={() => setMode('browse')}
          onLocationRefine={handleLocationRefine}
        />
      )}

      {/* Type mode */}
      {mode === 'type' && data.locationTag && data.reason && !typeResults && (
        <StepCatalogTypeFallback
          projectId={projectId}
          locationTag={data.locationTag}
          reason={data.reason}
          workType={workType ?? null}
          initialDraft={typeDraft}
          onResults={(description, resp) => {
            setTypeResults({ description, resp });
            setTypeSelected(new Set(resp.picks.slice(0, 1).map(p => p.catalog_id)));
          }}
          onCancel={() => setMode('qa')}
        />
      )}

      {mode === 'type' && typeResults && (
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">Sasha's read</p>
            <p className="mt-1 text-sm text-foreground leading-relaxed">{typeResults.description}</p>
          </div>
          {typeResults.resp.picks.length === 0 ? (
            <div className="rounded-lg border p-4 text-center text-sm text-muted-foreground">
              No automatic matches. Try Browse mode.
            </div>
          ) : (
            <div className="space-y-2">
              {typeResults.resp.picks.map(p => {
                const sel = typeSelected.has(p.catalog_id);
                return (
                  <button
                    key={p.catalog_id}
                    onClick={() => toggleTypePick(p.catalog_id)}
                    className={cn(
                      'w-full text-left rounded-lg border-2 p-3 transition-all',
                      sel ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/20' : 'border-border hover:border-amber-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 min-w-[2.25rem] px-1.5 items-center justify-center rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        {Math.round(p.confidence * 100)}
                      </span>
                      <span className="text-sm font-semibold flex-1">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.unit}</span>
                    </div>
                    {p.reasoning && <p className="mt-1 text-xs text-muted-foreground">{p.reasoning}</p>}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={confirmTypePicks} disabled={typeSelected.size === 0} className="bg-amber-600 hover:bg-amber-700 text-white">
              Add {typeSelected.size} item{typeSelected.size === 1 ? '' : 's'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setTypeResults(null); setTypeSelected(new Set()); }}>
              Edit description
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode('browse')}>Browse instead</Button>
          </div>
        </div>
      )}

      {/* Browse mode (legacy 3-tier picker) */}
      {mode === 'browse' && (
      <>
      

      {/* Search bar (spans all tiers) */}
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

      {/* Search results override tier display */}
      {query ? (
        <div className="border rounded-lg overflow-hidden divide-y">
          {searchResults.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No results</p>
          ) : searchResults.slice(0, 50).map(item => (
            <ItemRow key={item.id} item={item} selected={selectedIds.has(item.id)} onSelect={selectItem} subPath={item.path} />
          ))}
        </div>
      ) : (
        <>
          {/* Tier 1: Primary picks */}
          <TierSection
            icon={<Sparkles className="h-4 w-4 text-amber-500" />}
            title="For this work"
            count={filtered.primary.length}
            defaultExpanded
          >
            {filtered.primary.length === 0 ? (
              <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                No exact matches. Try the related items below or search.
              </p>
            ) : (
              filtered.primary.map(item => (
                <ItemRow key={item.id} item={item} selected={selectedIds.has(item.id)} onSelect={selectItem} highlight />
              ))
            )}
          </TierSection>

          {/* Tier 2: Related to this zone */}
          {filtered.secondary.length > 0 && (
            <CollapsibleTier
              title={`Related to this zone`}
              count={filtered.secondary.length}
              expanded={showSecondary}
              onToggle={() => setShowSecondary(v => !v)}
            >
              {filtered.secondary.map(item => (
                <ItemRow key={item.id} item={item} selected={selectedIds.has(item.id)} onSelect={selectItem} />
              ))}
            </CollapsibleTier>
          )}

          {/* Tier 3: Show everything (full drill-down) */}
          <CollapsibleTier
            title="Show everything"
            count={filtered.hidden.length}
            icon={<LayoutGrid className="h-4 w-4" />}
            expanded={showEverything}
            onToggle={() => setShowEverything(v => !v)}
          >
            {!showEverything ? null : (
              <div className="px-1 pb-1">
                {level !== 'division' && (
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

                {level === 'division' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3">
                    {divisions.map(div => (
                      <button
                        key={div.division}
                        onClick={() => navTo('category', div.division)}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-muted/40 transition-colors"
                      >
                        <span className="text-2xl">{div.icon}</span>
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
                          <p className="text-xs text-muted-foreground">{cat.itemCount} items</p>
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
                    {currentGrp.items.map(item => (
                      <ItemRow key={item.id} item={item} selected={selectedIds.has(item.id)} onSelect={selectItem} />
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </CollapsibleTier>
        </>
      )}
      </>
      )}

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

// ── Sub-components ────────────────────────────────────────────────

function ItemRow({
  item,
  selected,
  onSelect,
  highlight,
  subPath,
}: {
  item: ScopeCatalogItem;
  selected: boolean;
  onSelect: (item: ScopeCatalogItem) => void;
  highlight?: boolean;
  subPath?: string;
}) {
  return (
    <button
      onClick={() => onSelect(item)}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40',
        selected && 'bg-amber-50 dark:bg-amber-950/20'
      )}
    >
      <Checkbox selected={selected} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.item_name}</p>
        {subPath && <p className="text-xs text-muted-foreground truncate">{subPath}</p>}
      </div>
      {item.division === 'structural' && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
          Structural
        </span>
      )}
      {item.division === 'envelope_wrb' && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
          WRB
        </span>
      )}
      {highlight && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
          Suggested
        </span>
      )}
      <span className="text-xs text-muted-foreground shrink-0">{item.unit}</span>
    </button>
  );
}

function TierSection({
  icon,
  title,
  count,
  children,
  defaultExpanded = true,
}: {
  icon?: React.ReactNode;
  title: string;
  count: number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <span className="text-xs text-muted-foreground">— {count} {count === 1 ? 'item' : 'items'}</span>
      </div>
      {defaultExpanded && (
        <div className="border rounded-lg overflow-hidden divide-y">{children}</div>
      )}
    </div>
  );
}

function CollapsibleTier({
  title,
  count,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  count: number;
  icon?: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border hover:bg-muted/40 transition-colors text-left"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        {icon}
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground ml-auto">+{count} more</span>
      </button>
      {expanded && (
        <div className="border rounded-lg overflow-hidden divide-y">{children}</div>
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
    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2 px-2">
      {crumbs.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span>›</span>}
          <button onClick={c.onClick} className="hover:text-foreground transition-colors">{c.label}</button>
        </span>
      ))}
    </div>
  );
}
