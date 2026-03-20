import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, ChevronRight, MapPin, Home, Building2, Layers, DoorOpen, Plus, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWorkOrderCatalog } from '@/hooks/useWorkOrderCatalog';
import { useProjectScope, getLevelOptions, getExteriorOptions } from '@/hooks/useProjectScope';
import { ROOM_AREA_OPTIONS } from '@/types/location';
import { CO_REASON_LABELS, CO_REASON_COLORS } from '@/types/changeOrder';
import type { WorkOrderCatalogItem, COReasonCode } from '@/types/changeOrder';
import type { COWizardData, SelectedScopeItem } from './COWizard';

interface StepCatalogProps {
  data: COWizardData;
  onChange: (patch: Partial<COWizardData>) => void;
  projectId: string;
}

type DrillLevel = 'division' | 'category' | 'group' | 'item';

interface LocationFields {
  inside_outside: 'inside' | 'outside' | '';
  building: string;
  level: string;
  unit: string;
  room_area: string;
  custom_room_area: string;
  exterior_feature: string;
  custom_exterior: string;
}

type PendingPhase = 'location' | 'reason';

interface PendingState {
  item: WorkOrderCatalogItem;
  phase: PendingPhase;
  locationTag: string;
  reason: COReasonCode | null;
  reasonDescription: string;
}

const SEPARATOR = ' → ';
const EMPTY_FIELDS: LocationFields = {
  inside_outside: '', building: '', level: '', unit: '',
  room_area: '', custom_room_area: '', exterior_feature: '', custom_exterior: '',
};

const REASONS: { code: COReasonCode; description: string }[] = [
  { code: 'addition',          description: 'New scope not in the original contract' },
  { code: 'rework',            description: 'Something built wrong that needs to be redone' },
  { code: 'design_change',     description: 'Plans or drawings changed after work started' },
  { code: 'owner_request',     description: 'Owner asked for something different' },
  { code: 'gc_request',        description: 'GC directed the change' },
  { code: 'damaged_by_others', description: 'Another trade or party caused the damage' },
  { code: 'other',             description: 'Anything else' },
];

function buildLocationTag(f: LocationFields, exteriorLabel?: string): string {
  if (f.inside_outside === 'inside') {
    const parts = ['Inside'];
    if (f.building) parts.push(f.building);
    if (f.level) parts.push(f.level);
    if (f.unit) parts.push(`Unit ${f.unit}`);
    if (f.room_area && f.room_area !== 'Other') parts.push(f.room_area);
    else if (f.room_area === 'Other' && f.custom_room_area) parts.push(f.custom_room_area);
    return parts.join(SEPARATOR);
  }
  if (f.inside_outside === 'outside') {
    const parts = ['Outside'];
    if (f.exterior_feature === 'other' && f.custom_exterior) parts.push(f.custom_exterior);
    else if (f.exterior_feature && exteriorLabel) parts.push(exteriorLabel);
    return parts.join(SEPARATOR);
  }
  return '';
}

function isValidTag(tag: string): boolean {
  if (!tag) return false;
  return (tag.startsWith('Inside') || tag.startsWith('Outside')) && tag.includes(SEPARATOR);
}

export function StepCatalog({ data, onChange, projectId }: StepCatalogProps) {
  const { divisions, search, isLoading } = useWorkOrderCatalog();
  const { data: scope } = useProjectScope(projectId);

  const [pending, setPending] = useState<PendingState | null>(null);
  const [locationFields, setLocationFields] = useState<LocationFields>({ ...EMPTY_FIELDS });

  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<DrillLevel>('division');
  const [activeDivision, setActiveDivision] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set(data.selectedItems.map(i => i.id)), [data.selectedItems]);
  const searchResults = useMemo(() => search(query), [query, search]);

  const levelOptions = useMemo(() => getLevelOptions(scope ?? null), [scope]);
  const exteriorOptions = useMemo(() => getExteriorOptions(scope ?? null), [scope]);
  const numBuildings = scope?.num_buildings ?? 1;
  const numUnits = scope?.num_units ?? 0;

  const extLabel = exteriorOptions.find(o => o.value === locationFields.exterior_feature)?.label;
  const currentTag = buildLocationTag(locationFields, extLabel);
  const canConfirmLocation = isValidTag(currentTag);

  function selectItem(item: WorkOrderCatalogItem) {
    if (selectedIds.has(item.id)) {
      onChange({ selectedItems: data.selectedItems.filter(i => i.id !== item.id) });
      return;
    }
    setPending({ item, phase: 'location', locationTag: '', reason: null, reasonDescription: '' });
    setLocationFields({ ...EMPTY_FIELDS });
  }

  function goToReasonPhase() {
    if (!pending || !canConfirmLocation) return;
    setPending(prev => prev ? { ...prev, phase: 'reason', locationTag: currentTag } : null);
  }

  function confirmItem() {
    if (!pending || !pending.reason) return;
    if (pending.reason === 'other' && !pending.reasonDescription.trim()) return;
    const newItem: SelectedScopeItem = {
      ...pending.item,
      locationTag: pending.locationTag,
      reason: pending.reason,
      reasonDescription: pending.reasonDescription,
    };
    onChange({
      selectedItems: [...data.selectedItems, newItem],
      scopeDescription: data.scopeDescription || [...data.selectedItems, newItem].map(i => i.item_name).join(', '),
    });
    setPending(null);
    setLocationFields({ ...EMPTY_FIELDS });
  }

  function cancelPending() {
    setPending(null);
    setLocationFields({ ...EMPTY_FIELDS });
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

  const updateField = useCallback((field: keyof LocationFields, value: string) => {
    setLocationFields(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'inside_outside') {
        if (value === 'inside') { next.exterior_feature = ''; next.custom_exterior = ''; }
        else { next.building = ''; next.level = ''; next.unit = ''; next.room_area = ''; next.custom_room_area = ''; }
      }
      if (field === 'room_area' && value !== 'Other') next.custom_room_area = '';
      if (field === 'exterior_feature' && value !== 'other') next.custom_exterior = '';
      return next;
    });
  }, []);

  const currentDiv = divisions.find(d => d.division === activeDivision);
  const currentCat = currentDiv?.categories.find(c => c.category_id === activeCategory);
  const currentGrp = currentCat?.groups.find(g => g.group_id === activeGroup);

  const isInside = locationFields.inside_outside === 'inside';
  const isOutside = locationFields.inside_outside === 'outside';

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Loading catalog…</div>;
  }

  // ── REASON PICKER SCREEN ──
  if (pending && pending.phase === 'reason') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPending(prev => prev ? { ...prev, phase: 'location' } : null)} className="h-7 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{pending.item.item_name}</p>
            <p className="text-xs text-muted-foreground">Why is this item needed?</p>
          </div>
        </div>

        <div className="space-y-2">
          {REASONS.map(({ code, description }) => {
            const isSelected = pending.reason === code;
            const colors = CO_REASON_COLORS[code];
            return (
              <button
                key={code}
                onClick={() => setPending(prev => prev ? { ...prev, reason: code } : null)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all w-full',
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30 hover:bg-muted/40'
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

        <div className="space-y-1.5">
          <Label className="text-sm text-muted-foreground">
            {pending.reason === 'other' ? 'Description *' : 'Description (optional)'}
          </Label>
          <Textarea
            value={pending.reasonDescription}
            onChange={e => setPending(prev => prev ? { ...prev, reasonDescription: e.target.value } : null)}
            placeholder="Describe why this item is on the CO…"
            rows={2}
            className="resize-none"
          />
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <div className="flex-1 text-xs text-muted-foreground">
            📍 {pending.locationTag}
          </div>
          <Button
            size="sm"
            onClick={confirmItem}
            disabled={!pending.reason || (pending.reason === 'other' && !pending.reasonDescription.trim())}
            className="gap-1.5 shrink-0"
          >
            <Plus className="w-4 h-4" /> Add item
          </Button>
        </div>
      </div>
    );
  }

  // ── LOCATION PICKER SCREEN ──
  if (pending && pending.phase === 'location') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={cancelPending} className="h-7 px-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{pending.item.item_name}</p>
            <p className="text-xs text-muted-foreground">Assign a location for this item</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Location</Label>
            <div className="flex gap-3">
              <ToggleButton selected={isInside} onClick={() => updateField('inside_outside', 'inside')} icon={Home}>Inside</ToggleButton>
              <ToggleButton selected={isOutside} onClick={() => updateField('inside_outside', 'outside')} icon={Building2}>Outside</ToggleButton>
            </div>
          </div>

          {isInside && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              {numBuildings > 1 && (
                <div>
                  <Label className="flex items-center gap-2 mb-1.5"><Building2 className="w-4 h-4" />Building</Label>
                  <Select value={locationFields.building || ''} onValueChange={v => updateField('building', v)}>
                    <SelectTrigger className="h-10"><SelectValue placeholder="Select building..." /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: numBuildings }, (_, i) => {
                        const label = `Bldg ${String.fromCharCode(65 + i)}`;
                        return <SelectItem key={label} value={label}>{label}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label className="flex items-center gap-2 mb-1.5"><Layers className="w-4 h-4" />Level</Label>
                <Select value={locationFields.level || ''} onValueChange={v => updateField('level', v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select level..." /></SelectTrigger>
                  <SelectContent>
                    {levelOptions.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {numUnits > 1 && (
                <div>
                  <Label className="mb-1.5 block">Unit ID (Optional)</Label>
                  <Input placeholder="e.g., 101, A" value={locationFields.unit || ''} onChange={e => updateField('unit', e.target.value)} className="h-10" />
                </div>
              )}
              <div>
                <Label className="flex items-center gap-2 mb-1.5"><DoorOpen className="w-4 h-4" />Room / Area</Label>
                <Select value={locationFields.room_area || ''} onValueChange={v => updateField('room_area', v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select room or area..." /></SelectTrigger>
                  <SelectContent>
                    {ROOM_AREA_OPTIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {locationFields.room_area === 'Other' && (
                <div>
                  <Label className="mb-1.5 block">Specify Location</Label>
                  <Input placeholder="Describe..." value={locationFields.custom_room_area || ''} onChange={e => updateField('custom_room_area', e.target.value)} className="h-10" />
                </div>
              )}
            </div>
          )}

          {isOutside && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <div>
                <Label className="flex items-center gap-2 mb-1.5"><Building2 className="w-4 h-4" />Exterior Feature</Label>
                <Select value={locationFields.exterior_feature || ''} onValueChange={v => updateField('exterior_feature', v)}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select exterior feature..." /></SelectTrigger>
                  <SelectContent>
                    {exteriorOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {locationFields.exterior_feature === 'other' && (
                <div>
                  <Label className="mb-1.5 block">Specify Location</Label>
                  <Input placeholder="Describe..." value={locationFields.custom_exterior || ''} onChange={e => updateField('custom_exterior', e.target.value)} className="h-10" />
                </div>
              )}
            </div>
          )}

          {currentTag && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <div className="flex-1 border-l-2 border-primary/50 pl-3 py-1.5 bg-muted/30 rounded-r-lg">
                <p className="text-xs text-muted-foreground">Location preview</p>
                <p className="text-sm font-medium">{currentTag}</p>
              </div>
              <Button size="sm" onClick={goToReasonPhase} disabled={!canConfirmLocation} className="gap-1.5 shrink-0">
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── CATALOG BROWSER SCREEN ──
  return (
    <div className="space-y-4">
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

      {/* Selected items with locations + reasons */}
      {data.selectedItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">{data.selectedItems.length} selected</p>
          <div className="space-y-1.5">
            {data.selectedItems.map(item => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.item_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.locationTag && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.locationTag}</span>
                      </p>
                    )}
                    {item.reason && (
                      <span
                        className="inline-block px-1.5 py-0 rounded text-[10px] font-semibold"
                        style={{ backgroundColor: CO_REASON_COLORS[item.reason].bg, color: CO_REASON_COLORS[item.reason].text }}
                      >
                        {CO_REASON_LABELS[item.reason]}
                      </span>
                    )}
                  </div>
                  {item.reasonDescription && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{item.reasonDescription}</p>
                  )}
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

function ToggleButton({ selected, onClick, children, icon: Icon }: {
  selected: boolean; onClick: () => void; children: React.ReactNode; icon?: React.ElementType;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 font-medium transition-all flex-1',
        selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      {Icon && <Icon className="w-5 h-5" />}
      {children}
    </button>
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
