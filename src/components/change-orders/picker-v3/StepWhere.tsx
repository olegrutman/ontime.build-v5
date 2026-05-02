import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PickerState, PickerAction, SystemOption } from './types';

interface StepWhereProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
  projectId: string;
}

const FALLBACK_LOCATIONS = [
  { id: 'l1', icon: '🏢', label: 'Level 1', sub: 'Ground floor' },
  { id: 'l2', icon: '🏢', label: 'Level 2', sub: 'Second floor' },
  { id: 'l3', icon: '🏗', label: 'Exterior', sub: 'Building exterior' },
  { id: 'l6', icon: '⊞', label: 'Other / Custom', sub: 'Specify location' },
];

const SYSTEMS: SystemOption[] = [
  { id: 'floor', icon: '▭', label: 'Floor System', sub: 'Joists, subfloor, beams' },
  { id: 'wall', icon: '▮', label: 'Wall System', sub: 'Framing, sheathing' },
  { id: 'roof', icon: '◭', label: 'Roof System', sub: 'Rafters, ridge, sheathing' },
  { id: 'ceiling', icon: '▱', label: 'Ceiling System', sub: 'Joists, drops, soffits' },
  { id: 'exterior', icon: '◫', label: 'Exterior Envelope', sub: 'Siding, WRB, flashing' },
  { id: 'openings', icon: '⊟', label: 'Openings', sub: 'Windows, doors, ROs' },
  { id: 'deck', icon: '▥', label: 'Deck / Balcony', sub: 'Joists, decking' },
  { id: 'stair', icon: '⊿', label: 'Stair', sub: 'Stringers, treads' },
  { id: 'other', icon: '⊞', label: 'Other', sub: 'Specify system' },
];

function buildLocations(scope: any): { id: string; icon: string; label: string; sub: string }[] {
  if (!scope) return FALLBACK_LOCATIONS;
  const locs: { id: string; icon: string; label: string; sub: string }[] = [];

  const floors = scope.floors ?? scope.stories ?? 1;
  const numBuildings = scope.num_buildings ?? 1;
  const homeType = scope.home_type ?? '';

  // Generate per-floor entries
  for (let f = 1; f <= Math.min(floors, 8); f++) {
    locs.push({
      id: `floor-${f}`,
      icon: '🏢',
      label: `Level ${f}`,
      sub: f === 1 ? 'Ground floor' : `Floor ${f}`,
    });
  }

  // Basement if applicable
  if (scope.foundation_type === 'basement' || scope.basement_type) {
    locs.push({ id: 'basement', icon: '⬇', label: 'Basement', sub: scope.basement_type ?? 'Below grade' });
  }

  // Roof
  if (scope.roof_type) {
    locs.push({ id: 'roof', icon: '△', label: 'Roof', sub: scope.roof_type });
  }

  // Exterior
  locs.push({ id: 'exterior', icon: '🏗', label: 'Exterior', sub: 'Building exterior' });

  // Multi-building
  if (numBuildings > 1) {
    for (let b = 2; b <= Math.min(numBuildings, 6); b++) {
      locs.push({ id: `bldg-${b}`, icon: '🏠', label: `Building ${b}`, sub: `Structure ${b}` });
    }
  }

  // Balcony / deck
  if (scope.has_balconies) {
    locs.push({ id: 'balcony', icon: '▥', label: 'Balcony', sub: scope.balcony_type ?? 'Exterior platform' });
  }
  if (scope.decking_included) {
    locs.push({ id: 'deck', icon: '▥', label: 'Deck', sub: scope.decking_type ?? 'Exterior deck' });
  }

  // Other always at the end
  locs.push({ id: 'other', icon: '⊞', label: 'Other / Custom', sub: 'Specify location' });

  return locs;
}

export function StepWhere({ state, dispatch, projectId }: StepWhereProps) {
  const cur = state.items[state.currentItemIndex];

  const { data: scopeDetails } = useQuery({
    queryKey: ['project-scope-details', projectId],
    enabled: !!projectId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase
        .from('project_scope_details')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();
      return data;
    },
  });

  const locations = buildLocations(scopeDetails);

  const handleLocClick = (label: string) => {
    if (cur.multiLocation) {
      const next = cur.locations.includes(label)
        ? cur.locations.filter(l => l !== label)
        : [...cur.locations, label];
      dispatch({ type: 'SET_LOCATION', locations: next });
    } else {
      dispatch({ type: 'SET_LOCATION', locations: [label] });
    }
  };

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">Step 1 of 9 · Location</p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          Where is the work happening?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Pick the building location and the system you're working on. Toggle "multiple locations" to multi-select.
        </p>
      </div>

      {/* Multi-location toggle */}
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

      {/* Building Position */}
      <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[1.4px] mb-2.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
        Building Position
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 mb-5">
        {locations.map(loc => {
          const selected = cur.locations.includes(loc.label);
          return (
            <button
              key={loc.id}
              type="button"
              onClick={() => handleLocClick(loc.label)}
              className={cn(
                'flex flex-col gap-1.5 p-3 rounded-lg border-[1.5px] text-left min-h-[64px] transition-all relative',
                selected
                  ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_3px_rgba(245,166,35,0.12)]'
                  : 'bg-background border-border hover:border-amber-300 hover:bg-amber-50',
              )}
            >
              {selected && (
                <span className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[0.7rem] font-extrabold">
                  ✓
                </span>
              )}
              <span className="text-lg">{loc.icon}</span>
              <span className="text-[0.78rem] font-bold text-foreground leading-tight">{loc.label}</span>
              <span className="text-[0.62rem] text-muted-foreground">{loc.sub}</span>
            </button>
          );
        })}
      </div>

      {/* System Affected */}
      <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[1.4px] mb-2.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-border">
        System Affected
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
        {SYSTEMS.map(sys => {
          const selected = cur.system === sys.id;
          return (
            <button
              key={sys.id}
              type="button"
              onClick={() => dispatch({ type: 'SET_SYSTEM', systemId: sys.id, systemName: sys.label })}
              className={cn(
                'flex flex-col gap-1.5 p-3 rounded-lg border-[1.5px] text-left min-h-[64px] transition-all relative',
                selected
                  ? 'bg-amber-50 border-amber-400 shadow-[0_0_0_3px_rgba(245,166,35,0.12)]'
                  : 'bg-background border-border hover:border-amber-300 hover:bg-amber-50',
              )}
            >
              {selected && (
                <span className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full bg-amber-500 text-white flex items-center justify-center text-[0.7rem] font-extrabold">
                  ✓
                </span>
              )}
              <span className="text-lg">{sys.icon}</span>
              <span className="text-[0.78rem] font-bold text-foreground leading-tight">{sys.label}</span>
              <span className="text-[0.62rem] text-muted-foreground">{sys.sub}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
