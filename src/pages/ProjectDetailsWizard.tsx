import { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Home, Castle, Factory, Store, Layers, Hotel, Check, ChevronRight, ChevronLeft, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DetailsSummaryPanel } from '@/components/project-wizard-new/DetailsSummaryPanel';
import {
  WIZARD_STEPS, FOUNDATION_OPTIONS, FRAMING_SYSTEM_OPTIONS,
  FLOOR_SYSTEM_OPTIONS, ROOF_SYSTEM_OPTIONS, STRUCTURE_TYPE_OPTIONS,
  GARAGE_OPTIONS, DECK_PORCH_OPTIONS, ENTRY_TYPE_OPTIONS,
  SPECIAL_ROOM_OPTIONS, CORRIDOR_OPTIONS, ROOF_PITCH_OPTIONS,
  BASEMENT_SUBTYPE_OPTIONS, BASEMENT_FINISH_OPTIONS,
  GARAGE_CAR_COUNT_OPTIONS,
  WINDOW_TYPE_OPTIONS, PATIO_DOOR_TYPE_OPTIONS,
  SIDING_TYPE_OPTIONS, SIDING_LEVEL_OPTIONS,
  EXTERIOR_TRIM_TYPE_OPTIONS, SOFFIT_TYPE_OPTIONS, FASCIA_TYPE_OPTIONS,
  WRB_TYPE_OPTIONS, SCOPE_DECK_TYPE_OPTIONS,
  SCOPE_EXTRAS_OPTIONS, SCOPE_EXTRAS_COMMERCIAL,
  getSmartDefaults,
  type ProfileDraft, type ProjectType,
} from '@/types/projectProfile';
import { useProjectTypes, useProjectProfile, useSaveProjectProfile } from '@/hooks/useProjectProfile';

const TYPE_ICONS: Record<string, typeof Building2> = {
  apartment: Building2, townhome: Home, custom_home: Castle,
  production_home: Factory, commercial: Store, mixed_use: Layers,
  hotel: Hotel,
};
const TYPE_DESCRIPTIONS: Record<string, string> = {
  custom_home: 'Single family · any style',
  production_home: 'Tract · repeated plans',
  townhome: 'Attached · 2–3 stories per unit',
  apartment: 'Multi-unit · 3+ stories',
  hotel: 'Hospitality · multi-story',
  commercial: 'Office, retail, industrial',
  mixed_use: 'Residential + commercial',
};

function emptyDraft(projectId: string): ProfileDraft {
  return {
    project_id: projectId,
    project_type_id: '',
    stories: 2,
    units_per_building: null,
    number_of_buildings: 1,
    foundation_types: [],
    roof_type: null,
    has_garage: false, garage_types: [],
    has_basement: false, basement_type: null,
    has_stairs: false, stair_types: [],
    has_deck_balcony: false, has_pool: false, has_elevator: false,
    has_clubhouse: false, has_commercial_spaces: false, has_shed: false,
    is_complete: false,
    framing_system: null, floor_system: null, roof_system: null,
    structure_type: null,
    has_corridors: false, corridor_type: null,
    has_balcony: false, has_deck: false, has_covered_porch: false,
    deck_porch_type: null, entry_type: 'Standard',
    special_rooms: [], stories_per_unit: null, garage_car_count: null,
    // Scope defaults
    scope_windows_install: false, scope_windows_type: null,
    scope_patio_doors: false, scope_patio_door_type: null,
    scope_siding: false, scope_siding_type: null, scope_siding_level: null,
    scope_exterior_trim: false, scope_exterior_trim_type: null,
    scope_soffit_fascia: false, scope_fascia_type: null, scope_soffit_type: null,
    scope_backout: false,
    scope_backout_blocking: true, scope_backout_blocking_items: [],
    scope_backout_shimming: true, scope_backout_stud_repair: true,
    scope_backout_nailer_plates: true, scope_backout_pickup_framing: true,
    scope_decks_railings: false, scope_deck_type: null, scope_railings: false,
    scope_garage_framing: false, scope_garage_trim_openings: false,
    scope_wrb: false, scope_wrb_type: null, scope_sheathing: false,
    scope_extras: [],
    scope_fire_stopping: false,
    scope_stairs_scope: false,
    scope_curtain_wall: false, scope_storefront_framing: false,
  };
}

/* ─── Chip selector ────────────────────────────────────────── */
function ChipSelect({ options, selected, onToggle, multi = false }: {
  options: readonly string[];
  selected: string | string[] | null;
  onToggle: (val: string) => void;
  multi?: boolean;
}) {
  const isSelected = (o: string) =>
    multi ? (Array.isArray(selected) && selected.includes(o)) : selected === o;
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onToggle(o)}
          className={cn(
            'px-3 py-2 rounded-lg text-sm font-medium border min-h-[44px] transition-all',
            isSelected(o)
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-foreground border-border hover:border-primary/50',
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/* ─── Section wrapper ──────────────────────────────────────── */
function FieldSection({ label, subtitle, children }: { label: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <Label className="font-semibold">{label}</Label>
        {subtitle && <p className="text-xs text-muted-foreground -mt-1">{subtitle}</p>}
        {children}
      </CardContent>
    </Card>
  );
}

/* ─── Row helper ───────────────────────────────────────────── */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/* ─── Main wizard ──────────────────────────────────────────── */
export default function ProjectDetailsWizard() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: projectTypes = [] } = useProjectTypes();
  const { data: existingProfile } = useProjectProfile(projectId);
  const saveMutation = useSaveProjectProfile(projectId!);

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProfileDraft>(() => {
    if (existingProfile) return { ...existingProfile } as ProfileDraft;
    return emptyDraft(projectId!);
  });
  const [defaultsApplied, setDefaultsApplied] = useState(false);

  useEffect(() => {
    if (existingProfile && !draft.project_type_id) {
      setDraft({ ...existingProfile } as ProfileDraft);
    }
  }, [existingProfile]);

  const selectedType = useMemo(
    () => projectTypes.find(t => t.id === draft.project_type_id),
    [projectTypes, draft.project_type_id],
  );

  const slug = selectedType?.slug ?? '';
  const isSingleFamily = slug === 'custom_home' || slug === 'production_home';
  const isMultiFamily = slug === 'apartment' || slug === 'townhome';
  const isHotelCommercial = slug === 'hotel' || slug === 'commercial' || slug === 'mixed_use';

  const update = useCallback(<K extends keyof ProfileDraft>(key: K, val: ProfileDraft[K]) => {
    setDraft(prev => ({ ...prev, [key]: val }));
  }, []);

  const toggleArrayField = useCallback((key: 'foundation_types' | 'special_rooms' | 'scope_extras', val: string) => {
    setDraft(prev => {
      const arr = (prev[key] as string[]) || [];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val] };
    });
  }, []);

  const selectType = useCallback((pt: ProjectType) => {
    const defaults = getSmartDefaults(pt.slug);
    setDraft(prev => ({
      ...prev,
      ...defaults,
      project_type_id: pt.id,
      project_id: projectId!,
    }));
    setDefaultsApplied(true);
    setTimeout(() => setDefaultsApplied(false), 3000);
  }, [projectId]);

  const canAdvance = useMemo(() => {
    if (step === 0) return !!draft.project_type_id;
    if (step === 1) return draft.stories >= 1 && draft.foundation_types.length > 0;
    return true;
  }, [step, draft]);

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ ...draft, is_complete: true });
      toast({ title: 'Project saved', description: 'Building definition complete.' });
      navigate(`/project/${projectId}/scope-wizard`);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  /* ── STEP 0: Project Type ──────────────────────────────────── */
  const renderStep0 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-heading">What type of project is this?</h2>
        <p className="text-sm text-muted-foreground">This defines the building structure questions you'll answer next.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {projectTypes.map(pt => {
          const Icon = TYPE_ICONS[pt.slug] || Building2;
          const sel = draft.project_type_id === pt.id;
          return (
            <button
              key={pt.id}
              onClick={() => selectType(pt)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center min-h-[120px] transition-all',
                sel ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40',
              )}
            >
              <Icon className={cn('w-8 h-8', sel ? 'text-primary' : 'text-muted-foreground')} />
              <span className="font-semibold text-sm">{pt.name}</span>
              <span className="text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[pt.slug]}</span>
            </button>
          );
        })}
      </div>
      {defaultsApplied && (
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/10 rounded-lg px-3 py-2">
          <Check className="w-4 h-4" /> Defaults applied — adjust on the next step.
        </div>
      )}
    </div>
  );

  /* ── STEP 1: Building Structure (dynamic) ──────────────────── */
  const renderStep1 = () => {
    const showUnits = isMultiFamily || slug === 'mixed_use';
    const showBuildings = isMultiFamily || isHotelCommercial;

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold font-heading">Building Structure</h2>
          <p className="text-sm text-muted-foreground">Define what the building is — not what's in scope.</p>
        </div>

        {/* Scale */}
        <FieldSection label="Building Scale">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{isMultiFamily ? 'Stories per Building' : 'Number of Floors'}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button variant="outline" size="icon" className="h-10 w-10"
                  onClick={() => update('stories', Math.max(1, draft.stories - 1))}><Minus className="w-4 h-4" /></Button>
                <Input type="number" min={1} max={99} value={draft.stories}
                  onChange={e => update('stories', Math.max(1, Math.min(99, +e.target.value)))}
                  className="w-20 text-center" />
                <Button variant="outline" size="icon" className="h-10 w-10"
                  onClick={() => update('stories', Math.min(99, draft.stories + 1))}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            {slug === 'townhome' && (
              <div>
                <Label className="text-xs text-muted-foreground">Stories per Unit</Label>
                <Input type="number" min={1} max={5} value={draft.stories_per_unit ?? ''}
                  onChange={e => update('stories_per_unit', e.target.value ? +e.target.value : null)}
                  className="mt-1" />
              </div>
            )}
            {showUnits && (
              <div>
                <Label className="text-xs text-muted-foreground">Number of Units</Label>
                <Input type="number" min={1} value={draft.units_per_building ?? ''}
                  onChange={e => update('units_per_building', e.target.value ? +e.target.value : null)}
                  className="mt-1" />
              </div>
            )}
            {showBuildings && (
              <div>
                <Label className="text-xs text-muted-foreground">Number of Buildings</Label>
                <Input type="number" min={1} value={draft.number_of_buildings}
                  onChange={e => update('number_of_buildings', Math.max(1, +e.target.value))}
                  className="mt-1" />
              </div>
            )}
          </div>
        </FieldSection>

        {/* Foundation */}
        <FieldSection label="Foundation Type">
          <ChipSelect options={FOUNDATION_OPTIONS} selected={draft.foundation_types}
            onToggle={v => toggleArrayField('foundation_types', v)} multi />
          {draft.foundation_types.includes('Basement') && (
            <div className="mt-3 space-y-2 pl-2 border-l-2 border-primary/20">
              <Label className="text-xs text-muted-foreground">Basement Subtype</Label>
              <ChipSelect options={BASEMENT_SUBTYPE_OPTIONS} selected={draft.basement_type}
                onToggle={v => update('basement_type', draft.basement_type === v ? null : v)} />
            </div>
          )}
        </FieldSection>

        {/* Framing — single family / multi-family */}
        {(isSingleFamily || isMultiFamily) && (
          <FieldSection label="Framing System">
            <ChipSelect options={FRAMING_SYSTEM_OPTIONS} selected={draft.framing_system}
              onToggle={v => update('framing_system', draft.framing_system === v ? null : v)} />
          </FieldSection>
        )}

        {/* Structure Type — hotel/commercial */}
        {isHotelCommercial && (
          <FieldSection label="Structure Type">
            <ChipSelect options={STRUCTURE_TYPE_OPTIONS} selected={draft.structure_type}
              onToggle={v => update('structure_type', draft.structure_type === v ? null : v)} />
          </FieldSection>
        )}

        {/* Floor System */}
        <FieldSection label="Floor System">
          <ChipSelect options={FLOOR_SYSTEM_OPTIONS} selected={draft.floor_system}
            onToggle={v => update('floor_system', draft.floor_system === v ? null : v)} />
        </FieldSection>

        {/* Roof System */}
        <FieldSection label="Roof System">
          <ChipSelect options={isHotelCommercial ? ROOF_PITCH_OPTIONS : ROOF_SYSTEM_OPTIONS}
            selected={isHotelCommercial ? (draft.roof_system?.includes('Flat') ? 'Flat' : 'Pitched') : draft.roof_system}
            onToggle={v => {
              if (isHotelCommercial) {
                update('roof_system', v === 'Flat' ? 'Flat Roof System' : 'Pre-Manufactured Trusses');
              } else {
                update('roof_system', draft.roof_system === v ? null : v);
              }
            }} />
        </FieldSection>

        {/* Garage — single family only */}
        {isSingleFamily && (
          <FieldSection label="Garage">
            <ChipSelect options={GARAGE_OPTIONS} selected={
              draft.has_garage ? (draft.garage_types.includes('Detached') ? 'Detached' : 'Attached') : 'None'
            }
              onToggle={v => {
                if (v === 'None') {
                  update('has_garage', false);
                  update('garage_types', []);
                  update('garage_car_count', null);
                } else {
                  update('has_garage', true);
                  update('garage_types', [v === 'Attached' ? 'Attached private' : 'Detached private']);
                  if (!draft.garage_car_count) update('garage_car_count', 2);
                }
              }} />
            {draft.has_garage && (
              <div className="mt-3">
                <p className="text-sm font-medium text-muted-foreground mb-2">How many cars?</p>
                <ChipSelect options={GARAGE_CAR_COUNT_OPTIONS} selected={String(draft.garage_car_count ?? 2)}
                  onToggle={v => update('garage_car_count', Number(v))} />
              </div>
            )}
          </FieldSection>
        )}

        {/* Deck / Porch — single family */}
        {isSingleFamily && (
          <FieldSection label="Deck / Porch">
            <ChipSelect options={DECK_PORCH_OPTIONS} selected={draft.deck_porch_type}
              onToggle={v => {
                update('deck_porch_type', v);
                update('has_deck', v === 'Deck' || v === 'Both');
                update('has_covered_porch', v === 'Covered Porch' || v === 'Both');
                update('has_deck_balcony', v !== 'None');
              }} />
          </FieldSection>
        )}

        {/* Balcony — single family + multi-family */}
        {(isSingleFamily || isMultiFamily) && (
          <FieldSection label="Balcony">
            <div className="flex items-center gap-3">
              <Switch checked={draft.has_balcony} onCheckedChange={v => update('has_balcony', v)} />
              <span className="text-sm">{draft.has_balcony ? 'Yes' : 'No'}</span>
            </div>
          </FieldSection>
        )}

        {/* Corridors — multi-family */}
        {isMultiFamily && (
          <FieldSection label="Corridors">
            <ChipSelect options={CORRIDOR_OPTIONS} selected={draft.corridor_type}
              onToggle={v => {
                update('corridor_type', v);
                update('has_corridors', v !== 'None');
              }} />
          </FieldSection>
        )}

        {/* Elevator — multi-family + hotel/commercial */}
        {(isMultiFamily || isHotelCommercial) && (
          <FieldSection label="Elevator">
            <div className="flex items-center gap-3">
              <Switch checked={draft.has_elevator} onCheckedChange={v => update('has_elevator', v)} />
              <span className="text-sm">{draft.has_elevator ? 'Yes' : 'No'}</span>
            </div>
          </FieldSection>
        )}

        {/* Entry Type — single family */}
        {isSingleFamily && (
          <FieldSection label="Entry Type">
            <ChipSelect options={ENTRY_TYPE_OPTIONS} selected={draft.entry_type}
              onToggle={v => update('entry_type', v)} />
          </FieldSection>
        )}

        {/* Special Rooms — single family */}
        {isSingleFamily && (
          <FieldSection label="Special Rooms" subtitle="Select all that apply (or skip)">
            <ChipSelect options={SPECIAL_ROOM_OPTIONS} selected={draft.special_rooms}
              onToggle={v => toggleArrayField('special_rooms', v)} multi />
          </FieldSection>
        )}
      </div>
    );
  };

  /* ── STEP 2: Scope — What's Included? ────────────────────────── */
  const renderStep2 = () => {
    const extrasOptions = isHotelCommercial ? SCOPE_EXTRAS_COMMERCIAL : SCOPE_EXTRAS_OPTIONS;
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold font-heading">What's Included in This Project?</h2>
          <p className="text-sm text-muted-foreground">Define what work is part of this job — this drives your SOV and contract scope.</p>
        </div>

        {/* Windows & Doors */}
        <FieldSection label="Windows & Patio Doors" subtitle="Are you responsible for installing windows?">
          <div className="flex items-center gap-3">
            <Switch checked={draft.scope_windows_install} onCheckedChange={v => update('scope_windows_install', v)} />
            <span className="text-sm">{draft.scope_windows_install ? 'Installing windows' : 'Not included'}</span>
          </div>
          {draft.scope_windows_install && (
            <div className="mt-3 space-y-3 pl-2 border-l-2 border-primary/20">
              <div>
                <Label className="text-xs text-muted-foreground">Window Type</Label>
                <ChipSelect options={WINDOW_TYPE_OPTIONS} selected={draft.scope_windows_type}
                  onToggle={v => update('scope_windows_type', draft.scope_windows_type === v ? null : v)} />
              </div>
            </div>
          )}
          <div className="mt-3 flex items-center gap-3">
            <Switch checked={draft.scope_patio_doors} onCheckedChange={v => update('scope_patio_doors', v)} />
            <span className="text-sm">{draft.scope_patio_doors ? 'Patio doors included' : 'No patio doors'}</span>
          </div>
          {draft.scope_patio_doors && (
            <div className="mt-2 pl-2 border-l-2 border-primary/20">
              <Label className="text-xs text-muted-foreground">Door Type</Label>
              <ChipSelect options={PATIO_DOOR_TYPE_OPTIONS} selected={draft.scope_patio_door_type}
                onToggle={v => update('scope_patio_door_type', draft.scope_patio_door_type === v ? null : v)} />
            </div>
          )}
        </FieldSection>

        {/* Siding */}
        <FieldSection label="Siding" subtitle="Is siding included in this contract?">
          <div className="flex items-center gap-3">
            <Switch checked={draft.scope_siding} onCheckedChange={v => update('scope_siding', v)} />
            <span className="text-sm">{draft.scope_siding ? 'Siding included' : 'Not included'}</span>
          </div>
          {draft.scope_siding && (
            <div className="mt-3 space-y-3 pl-2 border-l-2 border-primary/20">
              <div>
                <Label className="text-xs text-muted-foreground">Siding Type</Label>
                <ChipSelect options={SIDING_TYPE_OPTIONS} selected={draft.scope_siding_type}
                  onToggle={v => update('scope_siding_type', draft.scope_siding_type === v ? null : v)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Coverage</Label>
                <ChipSelect options={SIDING_LEVEL_OPTIONS} selected={draft.scope_siding_level}
                  onToggle={v => update('scope_siding_level', draft.scope_siding_level === v ? null : v)} />
              </div>
            </div>
          )}
        </FieldSection>

        {/* Exterior Trim */}
        <FieldSection label="Exterior Trim" subtitle="Trim around windows, doors, corners, etc.">
          <div className="flex items-center gap-3">
            <Switch checked={draft.scope_exterior_trim} onCheckedChange={v => update('scope_exterior_trim', v)} />
            <span className="text-sm">{draft.scope_exterior_trim ? 'Trim included' : 'Not included'}</span>
          </div>
          {draft.scope_exterior_trim && (
            <div className="mt-3 pl-2 border-l-2 border-primary/20">
              <Label className="text-xs text-muted-foreground">Trim Material</Label>
              <ChipSelect options={EXTERIOR_TRIM_TYPE_OPTIONS} selected={draft.scope_exterior_trim_type}
                onToggle={v => update('scope_exterior_trim_type', draft.scope_exterior_trim_type === v ? null : v)} />
            </div>
          )}
        </FieldSection>

        {/* Soffit & Fascia */}
        <FieldSection label="Soffit & Fascia">
          <div className="flex items-center gap-3">
            <Switch checked={draft.scope_soffit_fascia} onCheckedChange={v => update('scope_soffit_fascia', v)} />
            <span className="text-sm">{draft.scope_soffit_fascia ? 'Included' : 'Not included'}</span>
          </div>
          {draft.scope_soffit_fascia && (
            <div className="mt-3 space-y-3 pl-2 border-l-2 border-primary/20">
              <div>
                <Label className="text-xs text-muted-foreground">Fascia Type</Label>
                <ChipSelect options={FASCIA_TYPE_OPTIONS} selected={draft.scope_fascia_type}
                  onToggle={v => update('scope_fascia_type', draft.scope_fascia_type === v ? null : v)} />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Soffit Type</Label>
                <ChipSelect options={SOFFIT_TYPE_OPTIONS} selected={draft.scope_soffit_type}
                  onToggle={v => update('scope_soffit_type', draft.scope_soffit_type === v ? null : v)} />
              </div>
            </div>
          )}
        </FieldSection>

        {/* WRB & Sheathing */}
        <FieldSection label="WRB & Sheathing" subtitle="Weather Resistant Barrier and wall sheathing">
          <div className="flex items-center gap-3 mb-2">
            <Switch checked={draft.scope_wrb} onCheckedChange={v => update('scope_wrb', v)} />
            <span className="text-sm">{draft.scope_wrb ? 'WRB included' : 'WRB not included'}</span>
          </div>
          {draft.scope_wrb && (
            <div className="mb-3 pl-2 border-l-2 border-primary/20">
              <Label className="text-xs text-muted-foreground">WRB Type</Label>
              <ChipSelect options={WRB_TYPE_OPTIONS} selected={draft.scope_wrb_type}
                onToggle={v => update('scope_wrb_type', draft.scope_wrb_type === v ? null : v)} />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Switch checked={draft.scope_sheathing} onCheckedChange={v => update('scope_sheathing', v)} />
            <span className="text-sm">{draft.scope_sheathing ? 'Sheathing included' : 'Not included'}</span>
          </div>
        </FieldSection>

        {/* Backout Plan */}
        <FieldSection label="Backout Plan" subtitle="Shimming, blocking, stud repair, pickup framing">
          <div className="flex items-center gap-3 mb-2">
            <Switch checked={draft.scope_backout} onCheckedChange={v => update('scope_backout', v)} />
            <span className="text-sm">{draft.scope_backout ? 'Backout included' : 'Not included'}</span>
          </div>
          {draft.scope_backout && (
            <div className="space-y-3 pl-2 border-l-2 border-primary/20">
              {/* Blocking */}
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Switch checked={draft.scope_backout_blocking} onCheckedChange={v => update('scope_backout_blocking', v)} />
                  <span className="text-sm">{draft.scope_backout_blocking ? 'Blocking included' : 'No blocking'}</span>
                </div>
                {draft.scope_backout_blocking && (
                  <div className="pl-4 mt-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Blocking Types</Label>
                    <ChipSelect options={BACKOUT_BLOCKING_OPTIONS} selected={draft.scope_backout_blocking_items}
                      onToggle={v => toggleArrayField('scope_backout_blocking_items', v)} multi />
                  </div>
                )}
              </div>
              {/* Shimming */}
              <div className="flex items-center gap-3">
                <Switch checked={draft.scope_backout_shimming} onCheckedChange={v => update('scope_backout_shimming', v)} />
                <span className="text-sm">{draft.scope_backout_shimming ? 'Shimming (doors & windows)' : 'No shimming'}</span>
              </div>
              {/* Stud Repair */}
              <div className="flex items-center gap-3">
                <Switch checked={draft.scope_backout_stud_repair} onCheckedChange={v => update('scope_backout_stud_repair', v)} />
                <span className="text-sm">{draft.scope_backout_stud_repair ? 'Stud repair / straightening' : 'No stud repair'}</span>
              </div>
              {/* Nailer Plates */}
              <div className="flex items-center gap-3">
                <Switch checked={draft.scope_backout_nailer_plates} onCheckedChange={v => update('scope_backout_nailer_plates', v)} />
                <span className="text-sm">{draft.scope_backout_nailer_plates ? 'Nailer plates' : 'No nailer plates'}</span>
              </div>
              {/* Pickup Framing */}
              <div className="flex items-center gap-3">
                <Switch checked={draft.scope_backout_pickup_framing} onCheckedChange={v => update('scope_backout_pickup_framing', v)} />
                <span className="text-sm">{draft.scope_backout_pickup_framing ? 'Pickup framing & patching' : 'No pickup framing'}</span>
              </div>
            </div>
          )}
        </FieldSection>

        {/* Decks & Railings — single family */}
        {isSingleFamily && (
          <FieldSection label="Decks & Railings" subtitle="Deck framing and railing installation">
            <div className="flex items-center gap-3 mb-2">
              <Switch checked={draft.scope_decks_railings} onCheckedChange={v => update('scope_decks_railings', v)} />
              <span className="text-sm">{draft.scope_decks_railings ? 'Decks included' : 'Not included'}</span>
            </div>
            {draft.scope_decks_railings && (
              <div className="space-y-3 pl-2 border-l-2 border-primary/20">
                <div>
                  <Label className="text-xs text-muted-foreground">Deck Material</Label>
                  <ChipSelect options={SCOPE_DECK_TYPE_OPTIONS} selected={draft.scope_deck_type}
                    onToggle={v => update('scope_deck_type', draft.scope_deck_type === v ? null : v)} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={draft.scope_railings} onCheckedChange={v => update('scope_railings', v)} />
                  <span className="text-sm">{draft.scope_railings ? 'Railings included' : 'No railings'}</span>
                </div>
              </div>
            )}
          </FieldSection>
        )}

        {/* Garage Framing — single family with garage */}
        {isSingleFamily && draft.has_garage && (
          <FieldSection label="Garage Scope" subtitle="Framing and trim around garage openings">
            <div className="flex items-center gap-3 mb-2">
              <Switch checked={draft.scope_garage_framing} onCheckedChange={v => update('scope_garage_framing', v)} />
              <span className="text-sm">{draft.scope_garage_framing ? 'Garage framing included' : 'Not included'}</span>
            </div>
            {draft.scope_garage_framing && (
              <div className="flex items-center gap-3 pl-2 border-l-2 border-primary/20">
                <Switch checked={draft.scope_garage_trim_openings} onCheckedChange={v => update('scope_garage_trim_openings', v)} />
                <span className="text-sm">{draft.scope_garage_trim_openings ? 'Trim around openings included' : 'No trim around openings'}</span>
              </div>
            )}
          </FieldSection>
        )}

        {/* Multi-family specific */}
        {isMultiFamily && (
          <>
            <FieldSection label="Fire Stopping">
              <div className="flex items-center gap-3">
                <Switch checked={draft.scope_fire_stopping} onCheckedChange={v => update('scope_fire_stopping', v)} />
                <span className="text-sm">{draft.scope_fire_stopping ? 'Included' : 'Not included'}</span>
              </div>
            </FieldSection>
            {draft.has_stairs && (
              <FieldSection label="Stairs Scope" subtitle="Stair framing and installation">
                <div className="flex items-center gap-3">
                  <Switch checked={draft.scope_stairs_scope} onCheckedChange={v => update('scope_stairs_scope', v)} />
                  <span className="text-sm">{draft.scope_stairs_scope ? 'Stairs in scope' : 'Not in scope'}</span>
                </div>
              </FieldSection>
            )}
          </>
        )}

        {/* Hotel/Commercial specific */}
        {isHotelCommercial && (
          <>
            <FieldSection label="Curtain Wall Framing">
              <div className="flex items-center gap-3">
                <Switch checked={draft.scope_curtain_wall} onCheckedChange={v => update('scope_curtain_wall', v)} />
                <span className="text-sm">{draft.scope_curtain_wall ? 'Included' : 'Not included'}</span>
              </div>
            </FieldSection>
            <FieldSection label="Storefront Framing">
              <div className="flex items-center gap-3">
                <Switch checked={draft.scope_storefront_framing} onCheckedChange={v => update('scope_storefront_framing', v)} />
                <span className="text-sm">{draft.scope_storefront_framing ? 'Included' : 'Not included'}</span>
              </div>
            </FieldSection>
          </>
        )}

        {/* Extras */}
        <FieldSection label="Extras" subtitle="Select any additional items in scope">
          <ChipSelect options={extrasOptions} selected={draft.scope_extras}
            onToggle={v => toggleArrayField('scope_extras', v)} multi />
        </FieldSection>
      </div>
    );
  };

  /* ── STEP 3: Review ────────────────────────────────────────── */
  const renderReview = () => {
    const scopeItems = [
      draft.scope_windows_install && `Windows${draft.scope_windows_type ? ` — ${draft.scope_windows_type}` : ''}`,
      draft.scope_patio_doors && `Patio Doors${draft.scope_patio_door_type ? ` — ${draft.scope_patio_door_type}` : ''}`,
      draft.scope_siding && `Siding${draft.scope_siding_type ? ` — ${draft.scope_siding_type}` : ''}${draft.scope_siding_level ? ` (${draft.scope_siding_level})` : ''}`,
      draft.scope_exterior_trim && `Exterior Trim${draft.scope_exterior_trim_type ? ` — ${draft.scope_exterior_trim_type}` : ''}`,
      draft.scope_soffit_fascia && 'Soffit & Fascia',
      draft.scope_wrb && `WRB${draft.scope_wrb_type ? ` — ${draft.scope_wrb_type}` : ''}`,
      draft.scope_sheathing && 'Sheathing',
      draft.scope_backout && 'Backout Plan',
      draft.scope_decks_railings && `Decks${draft.scope_deck_type ? ` — ${draft.scope_deck_type}` : ''}${draft.scope_railings ? ' + Railings' : ''}`,
      draft.scope_garage_framing && `Garage Framing${draft.scope_garage_trim_openings ? ' + Trim' : ''}`,
      draft.scope_interior_blocking && 'Interior Blocking',
      draft.scope_fire_stopping && 'Fire Stopping',
      draft.scope_stairs_scope && 'Stairs',
      draft.scope_curtain_wall && 'Curtain Wall Framing',
      draft.scope_storefront_framing && 'Storefront Framing',
      ...draft.scope_extras.map(e => e),
    ].filter(Boolean) as string[];

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold font-heading">Review Project Definition</h2>
          <p className="text-sm text-muted-foreground">Confirm everything looks right before saving.</p>
        </div>

        <Card><CardContent className="p-4 space-y-4">
          <Label className="font-semibold">Building Summary</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <Row label="Project Type" value={selectedType?.name ?? '—'} />
            <Row label="Floors / Stories" value={String(draft.stories)} />
            {draft.stories_per_unit && <Row label="Stories per Unit" value={String(draft.stories_per_unit)} />}
            {draft.units_per_building && <Row label="Units" value={String(draft.units_per_building)} />}
            {draft.number_of_buildings > 1 && <Row label="Buildings" value={String(draft.number_of_buildings)} />}
            {draft.framing_system && <Row label="Framing" value={draft.framing_system} />}
            {draft.structure_type && <Row label="Structure" value={draft.structure_type} />}
            {draft.floor_system && <Row label="Floor System" value={draft.floor_system} />}
            {draft.roof_system && <Row label="Roof System" value={draft.roof_system} />}
            {draft.entry_type && draft.entry_type !== 'Standard' && <Row label="Entry" value={draft.entry_type} />}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2">
            {draft.foundation_types.map(f => <Badge key={f} className="bg-primary/15 text-primary border-0">{f}</Badge>)}
            {draft.has_basement && draft.basement_type && <Badge className="bg-primary/15 text-primary border-0">{draft.basement_type} Basement</Badge>}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              draft.has_garage && `Garage (${draft.garage_types[0] || 'Yes'}${draft.garage_car_count ? `, ${draft.garage_car_count}-car` : ''})`,
              draft.has_balcony && 'Balcony',
              draft.deck_porch_type && draft.deck_porch_type !== 'None' && draft.deck_porch_type,
              draft.has_corridors && draft.corridor_type && `${draft.corridor_type} Corridors`,
              draft.has_elevator && 'Elevator',
              draft.has_stairs && 'Stairs',
            ].filter(Boolean).map(f => (
              <Badge key={f as string} variant="secondary">{f}</Badge>
            ))}
          </div>

          {draft.special_rooms.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {draft.special_rooms.map(r => (
                <Badge key={r} className="bg-accent/50 text-accent-foreground border-0">{r}</Badge>
              ))}
            </div>
          )}
        </CardContent></Card>

        {scopeItems.length > 0 && (
          <Card><CardContent className="p-4 space-y-3">
            <Label className="font-semibold">Scope Summary</Label>
            <p className="text-xs text-muted-foreground">What's included in this project's work</p>
            <div className="flex flex-wrap gap-1.5">
              {scopeItems.map(item => (
                <Badge key={item} className="bg-primary/10 text-primary border-0">{item}</Badge>
              ))}
            </div>
          </CardContent></Card>
        )}
      </div>
    );
  };

  const steps = [renderStep0, renderStep1, renderStep2, renderReview];
  const totalSteps = steps.length;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile: top progress bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-card border-b px-4 py-3">
        <div className="flex items-center gap-1 sm:gap-2 max-w-3xl mx-auto">
          <button onClick={() => navigate(`/project/${projectId}/scope`)} className="mr-2 p-1.5 rounded-md hover:bg-muted transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Exit wizard">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
          {WIZARD_STEPS.map((label, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <button
                key={i}
                disabled={i > step}
                onClick={() => i < step && setStep(i)}
                className={cn(
                  'flex items-center gap-1.5 text-xs font-medium transition-colors min-h-[44px] px-1',
                  done && 'text-green-600 cursor-pointer',
                  active && 'text-primary font-bold',
                  !done && !active && 'text-muted-foreground',
                  i > step && 'opacity-40 cursor-not-allowed',
                )}
              >
                <span className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                  done && 'bg-green-600 text-white',
                  active && 'bg-secondary text-secondary-foreground',
                  !done && !active && 'bg-muted/30 text-muted-foreground',
                )}>
                  {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
                {i < WIZARD_STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground hidden sm:block" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <div className="sticky top-6 space-y-1">
            <button onClick={() => navigate(`/project/${projectId}/scope`)} className="mb-3 p-1.5 rounded-md hover:bg-muted transition-colors" aria-label="Exit wizard">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            {WIZARD_STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <button
                  key={i}
                  disabled={i > step}
                  onClick={() => i <= step && setStep(i)}
                  className={cn(
                    'flex items-center gap-2 w-full text-left text-sm py-2 px-2 rounded-md transition-colors min-h-[40px]',
                    done && 'text-green-600 cursor-pointer hover:bg-muted/50',
                    active && 'text-primary font-semibold bg-muted',
                    !done && !active && 'text-muted-foreground',
                    i > step && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <span className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                    done && 'bg-green-600 text-white',
                    active && 'bg-secondary text-secondary-foreground',
                    !done && !active && 'bg-muted/30 text-muted-foreground',
                  )}>
                    {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  {label}
                </button>
              );
            })}
            <DetailsSummaryPanel draft={draft} typeName={selectedType?.name} />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 max-w-2xl">
          {steps[step]()}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="sticky bottom-0 bg-card border-t px-4 py-3">
        <div className="max-w-2xl mx-auto flex justify-between lg:ml-56 lg:pl-6">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(s => s - 1)}
            className="min-h-[44px]">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < totalSteps - 1 ? (
            <Button disabled={!canAdvance} onClick={() => setStep(s => s + 1)}
              className="min-h-[44px]">
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saveMutation.isPending}
              className="min-h-[44px]">
              {saveMutation.isPending ? 'Saving...' : 'Save & Continue'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
