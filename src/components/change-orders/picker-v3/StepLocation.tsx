import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PickerState, PickerAction } from './types';
import { Tile, SectionLabel, floorLabel } from './sharedPicker';
import type { LocationType } from './catalog';

interface StepLocationProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
  projectId: string;
}

interface LocationOption {
  id: string;
  icon: string;
  label: string;
  sub: string;
  /** Catalog location type — drives the System step's allowed set. */
  type: LocationType;
}

const FALLBACK_LOCATIONS: LocationOption[] = [
  { id: 'l1',  icon: '🏢', label: 'Level 1',          sub: 'Ground floor',           type: 'interior-floor' },
  { id: 'l2',  icon: '🏢', label: 'Level 2',          sub: 'Second floor',           type: 'interior-floor' },
  { id: 'ext', icon: '🏗', label: 'Exterior',         sub: 'Building exterior',      type: 'exterior-zone' },
  { id: 'site',icon: '⊞',  label: 'Site',             sub: 'Sitework / landscape',   type: 'site' },
];

function buildLocations(scope: any): LocationOption[] {
  if (!scope) return FALLBACK_LOCATIONS;
  const locs: LocationOption[] = [];
  const floors = scope.floors ?? scope.stories ?? 1;
  const numBuildings = scope.num_buildings ?? 1;

  const foundation = (scope.foundation_type ?? '').toString().toLowerCase();
  const hasBasement = foundation.includes('basement') || !!scope.basement_type;

  // Site & foundation are always available so users can route sitework / footings.
  locs.push({ id: 'site', icon: '⊞', label: 'Site', sub: 'Sitework, paving, landscape', type: 'site' });
  locs.push({
    id: 'foundation',
    icon: '▭',
    label: 'Foundation',
    sub: scope.foundation_type ?? 'Footings / slab / walls',
    type: 'foundation',
  });

  if (hasBasement) {
    locs.push({
      id: 'basement',
      icon: '⬇',
      label: 'Basement',
      sub: scope.basement_type ? `Ground level · ${scope.basement_type}` : 'Ground level',
      type: 'basement',
    });
  }

  for (let f = 1; f <= Math.min(floors, 8); f++) {
    const label = floorLabel(f);
    const sub = !hasBasement && f === 1 ? `Ground level · Level ${f}` : `Level ${f}`;
    locs.push({ id: `floor-${f}`, icon: '🏢', label, sub, type: 'interior-floor' });
  }

  locs.push({ id: 'attic', icon: '◮', label: 'Attic', sub: 'Above ceiling', type: 'attic' });

  if (scope.roof_type) {
    locs.push({ id: 'roof', icon: '△', label: 'Roof', sub: scope.roof_type, type: 'roof' });
  } else {
    locs.push({ id: 'roof', icon: '△', label: 'Roof', sub: 'Above top floor', type: 'roof' });
  }

  locs.push({ id: 'ext-wall', icon: '▮', label: 'Exterior Walls', sub: 'Siding, sheathing, windows', type: 'exterior-wall' });
  locs.push({ id: 'ext-zone', icon: '🏗', label: 'Exterior Zone', sub: 'Facade, porch, balcony', type: 'exterior-zone' });

  if (numBuildings > 1) {
    for (let b = 2; b <= Math.min(numBuildings, 6); b++) {
      locs.push({ id: `bldg-${b}`, icon: '🏠', label: `Building ${b}`, sub: `Structure ${b}`, type: 'interior-floor' });
    }
  }
  if (scope.has_balconies) locs.push({ id: 'balcony', icon: '▥', label: 'Balcony', sub: scope.balcony_type ?? 'Exterior platform', type: 'exterior-zone' });
  if (scope.decking_included) locs.push({ id: 'deck', icon: '▥', label: 'Deck', sub: scope.decking_type ?? 'Exterior deck', type: 'exterior-zone' });
  if (scope.has_garage) locs.push({ id: 'garage', icon: '🚪', label: 'Garage', sub: 'Attached structure', type: 'garage' });

  return locs;
}

export function StepLocation({ state, dispatch, projectId }: StepLocationProps) {
  const cur = state.items[state.currentItemIndex];

  const { data: scopeDetails } = useQuery({
    queryKey: ['picker-scope', projectId],
    enabled: !!projectId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data: details } = await supabase
        .from('project_scope_details')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      if (details) return details;

      const { data: answers } = await supabase
        .from('project_setup_answers')
        .select('field_key, value')
        .eq('project_id', projectId);
      if (!answers || answers.length === 0) return null;

      const map: Record<string, any> = {};
      for (const row of answers) map[row.field_key] = row.value;

      const truthy = (v: any) => v === true || v === 'yes' || v === 'true';
      const stories = Number(map.stories) || Number(map.floors) || 1;
      const hasBasement = truthy(map.has_basement) || !!map.basement_type;
      const basementLabel = truthy(map.basement_walkout)
        ? 'Walkout'
        : (typeof map.basement_type === 'string' ? map.basement_type : null);

      return {
        floors: stories,
        stories,
        foundation_type: hasBasement ? 'basement' : (map.foundation_type ?? null),
        basement_type: basementLabel,
        roof_type: typeof map.roof_type === 'string' ? map.roof_type : null,
        has_balconies: truthy(map.has_balconies),
        decking_included: truthy(map.has_rooftop_deck) || truthy(map.decking_included),
        has_garage: truthy(map.has_garage),
        num_buildings: Number(map.num_buildings) || 1,
        home_type: map.home_type ?? map.building_type ?? null,
      } as any;
    },
  });

  const locations = buildLocations(scopeDetails);

  const handleLocClick = (loc: LocationOption) => {
    const has = cur.locations.includes(loc.label);
    if (cur.multiLocation) {
      if (has) {
        const idx = cur.locations.indexOf(loc.label);
        const nextLocs = cur.locations.filter((_, i) => i !== idx);
        const nextTypes = cur.locationTypes.filter((_, i) => i !== idx);
        dispatch({ type: 'SET_LOCATION', locations: nextLocs, locationTypes: nextTypes });
      } else {
        dispatch({
          type: 'SET_LOCATION',
          locations: [...cur.locations, loc.label],
          locationTypes: [...cur.locationTypes, loc.type],
        });
      }
    } else {
      dispatch({ type: 'SET_LOCATION', locations: [loc.label], locationTypes: [loc.type] });
    }
  };

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">
          Step 1 of 6 · Location
        </p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          Where is the work?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Pick the building position. The systems available next depend on where you're working.
        </p>
      </div>

      <SectionLabel>Building Position</SectionLabel>

      <div className="flex items-center gap-3 p-3 bg-background border rounded-lg mb-3.5">
        <Switch
          checked={cur.multiLocation}
          onCheckedChange={() => dispatch({ type: 'TOGGLE_MULTI_LOCATION' })}
        />
        <div className="flex-1">
          <p className="text-[0.82rem] font-bold text-foreground">Apply to multiple locations</p>
          <p className="text-[0.7rem] text-muted-foreground">Same work, different spots — quantities multiply</p>
        </div>
        {cur.multiLocation && cur.locations.length > 0 && (
          <span className="text-[0.72rem] font-semibold font-mono text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
            {cur.locations.length} selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2 mb-2">
        {locations.map((loc) => (
          <Tile
            key={loc.id}
            selected={cur.locations.includes(loc.label)}
            onClick={() => handleLocClick(loc)}
            icon={loc.icon}
            label={loc.label}
            sub={loc.sub}
          />
        ))}
      </div>
    </div>
  );
}
