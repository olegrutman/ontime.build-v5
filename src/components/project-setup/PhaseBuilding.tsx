import { useState, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DT } from '@/lib/design-tokens';
import { ChevronRight, Minus, Plus } from 'lucide-react';
import {
  FOUNDATION_OPTIONS, FLOOR_SYSTEM_OPTIONS, ROOF_SYSTEM_OPTIONS,
  GARAGE_OPTIONS, ROOF_PITCH_OPTIONS,
  BASEMENT_SUBTYPE_OPTIONS, GARAGE_CAR_COUNT_OPTIONS,
  getSmartDefaults,
  type ProfileDraft, type ProjectType,
} from '@/types/projectProfile';
import { useProjectTypes, useProjectProfile, useSaveProjectProfile } from '@/hooks/useProjectProfile';

/* ── Chip selector ──────────────────────────────────────── */
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

const TYPE_ICONS: Record<string, string> = {
  custom_home: '🏠', production_home: '🏘️', townhome: '🏡',
  apartment: '🏢', hotel: '🏨', commercial: '🏪', mixed_use: '🏗️',
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
    // Dead scope fields — kept for type compat, not shown in UI
    scope_windows_install: false, scope_windows_type: null,
    scope_patio_doors: false, scope_patio_door_type: null,
    scope_siding: false, scope_siding_type: null, scope_siding_level: null,
    scope_exterior_trim: false, scope_exterior_trim_type: null,
    scope_soffit_fascia: false, scope_fascia_type: null, scope_soffit_type: null,
    scope_backout: false,
    scope_backout_blocking: false, scope_backout_blocking_items: [],
    scope_backout_shimming: false, scope_backout_stud_repair: false,
    scope_backout_nailer_plates: false, scope_backout_pickup_framing: false,
    scope_decks_railings: false, scope_deck_type: null, scope_railings: false,
    scope_garage_framing: false, scope_garage_trim_openings: false,
    scope_wrb: false, scope_wrb_type: null, scope_sheathing: false,
    scope_extras: [],
    scope_fire_stopping: false,
    scope_stairs_scope: false,
    scope_curtain_wall: false, scope_storefront_framing: false,
  };
}

interface PhaseBuildingProps {
  projectId: string;
  onComplete: () => void;
  onStepChange?: (step: string) => void;
}

export function PhaseBuilding({ projectId, onComplete, onStepChange }: PhaseBuildingProps) {
  const { toast } = useToast();
  const { data: projectTypes = [] } = useProjectTypes();
  const { data: existingProfile } = useProjectProfile(projectId);
  const saveMutation = useSaveProjectProfile(projectId);

  const [draft, setDraft] = useState<ProfileDraft>(() => {
    if (existingProfile) return { ...existingProfile } as ProfileDraft;
    return emptyDraft(projectId);
  });

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

  const toggleArrayField = useCallback((key: 'foundation_types' | 'special_rooms', val: string) => {
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
      project_id: projectId,
    }));
  }, [projectId]);

  const showUnits = isMultiFamily || slug === 'mixed_use';
  const showBuildings = isMultiFamily || isHotelCommercial;

  const canSave = !!draft.project_type_id && draft.stories >= 1 && draft.foundation_types.length > 0;

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ ...draft, is_complete: true });
      toast({ title: 'Building profile saved' });
      onComplete();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  useEffect(() => {
    if (!draft.project_type_id) {
      onStepChange?.('basics');
    } else {
      onStepChange?.('profile');
    }
  }, [draft.project_type_id]);

  return (
    <div className="space-y-6 max-w-[680px] mx-auto">
      {/* Step 1: Project Type */}
      <div>
        <h2 className="text-lg font-bold font-heading" style={DT.heading}>
          What type of project is this?
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          This defines the building structure and scope questions.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {projectTypes.map(pt => {
          const sel = draft.project_type_id === pt.id;
          return (
            <button
              key={pt.id}
              onClick={() => selectType(pt)}
              className={cn(
                'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center min-h-[100px] transition-all',
                sel ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40',
              )}
            >
              <span className="text-2xl">{TYPE_ICONS[pt.slug] || '🏗️'}</span>
              <span className="font-semibold text-sm">{pt.name}</span>
            </button>
          );
        })}
      </div>

      {/* Step 2: Building Structure — physical definition only */}
      {draft.project_type_id && (
        <>
          <div className="border-t border-border pt-6">
            <h2 className="text-lg font-bold font-heading" style={DT.heading}>
              Building Structure
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Define the physical building — scope details come in the next phase.
            </p>
          </div>

          {/* Scale */}
          <FieldSection label="Building Scale">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  {isMultiFamily ? 'Stories per Building' : 'Number of Floors'}
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <Button variant="outline" size="icon" className="h-10 w-10"
                    onClick={() => update('stories', Math.max(1, draft.stories - 1))}>
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input type="number" min={1} max={99} value={draft.stories}
                    onChange={e => update('stories', Math.max(1, Math.min(99, +e.target.value)))}
                    className="w-20 text-center" />
                  <Button variant="outline" size="icon" className="h-10 w-10"
                    onClick={() => update('stories', Math.min(99, draft.stories + 1))}>
                    <Plus className="w-4 h-4" />
                  </Button>
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

          {/* Garage — SFR only (scope details for tuck-under handled in scope wizard) */}
          {isSingleFamily && (
            <FieldSection label="Garage">
              <ChipSelect options={GARAGE_OPTIONS} selected={
                draft.has_garage ? (draft.garage_types.includes('Detached') ? 'Detached' : 'Attached') : 'None'
              }
                onToggle={v => {
                  if (v === 'None') {
                    update('has_garage', false);
                    update('garage_types', []);
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

          {/* Save */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button onClick={handleSave} disabled={!canSave || saveMutation.isPending} className="min-h-[44px]">
              {saveMutation.isPending ? 'Saving…' : 'Save & Continue to Scope'}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
