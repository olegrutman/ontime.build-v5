import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import type { PickerState, PickerAction, SystemOption } from './types';

interface StepWhereProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
  projectId: string;
}

const LOCATIONS = [
  { id: 'l1', icon: '🏢', label: 'Level 2 — Unit 4', sub: 'Grid C-D / 4-5' },
  { id: 'l2', icon: '🏢', label: 'Level 2 — Unit 5', sub: 'Grid D-E / 4-5' },
  { id: 'l3', icon: '🏢', label: 'Level 2 — Unit 6', sub: 'Grid E-F / 4-5' },
  { id: 'l4', icon: '🏢', label: 'Level 3 — All', sub: 'Floor plate' },
  { id: 'l5', icon: '🏗', label: 'Exterior · East', sub: 'Bldg A facade' },
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

export function StepWhere({ state, dispatch }: StepWhereProps) {
  const cur = state.items[state.currentItemIndex];

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
        {LOCATIONS.map(loc => {
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
