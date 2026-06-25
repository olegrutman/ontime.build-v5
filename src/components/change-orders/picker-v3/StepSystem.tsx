import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { PickerState, PickerAction } from './types';
import { allowedSystemIdsForItem } from './types';
import { Tile, SectionLabel } from './sharedPicker';
import { SYSTEMS, LOCATION_TYPE_LABELS } from './catalog';

interface StepSystemProps {
  state: PickerState;
  dispatch: React.Dispatch<PickerAction>;
}

// Loose grouping for the picker — purely cosmetic, ordering only.
const GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Structural / Shell',   ids: ['excavation','footings','foundation_wall','slab','framing_floor','framing_wall','framing_roof','sheathing'] },
  { label: 'Envelope',             ids: ['roofing','siding','windows','exterior_doors','waterproofing','insulation'] },
  { label: 'Interior Finishes',    ids: ['drywall','paint','flooring','tile','interior_doors','trim','cabinets','countertops','appliances'] },
  { label: 'MEP',                  ids: ['plumbing_rough','plumbing_fix','electrical_rough','electrical_dev','lighting','hvac_duct','hvac_equip','low_voltage','fire_protection'] },
  { label: 'Site',                 ids: ['sitework','paving','landscape','fencing'] },
];

const SYSTEM_ICONS: Record<string, string> = {
  excavation:'⛏', footings:'▭', foundation_wall:'▮', slab:'▬',
  framing_floor:'▭', framing_wall:'▮', framing_roof:'◭', sheathing:'▦',
  roofing:'△', siding:'◫', windows:'▢', exterior_doors:'🚪',
  waterproofing:'💧', insulation:'▒',
  drywall:'▱', paint:'🎨', flooring:'▤', tile:'▦', interior_doors:'🚪',
  trim:'─', cabinets:'▤', countertops:'▬', appliances:'⚡',
  plumbing_rough:'💧', plumbing_fix:'🚿', electrical_rough:'⚡', electrical_dev:'⊞',
  lighting:'💡', hvac_duct:'≋', hvac_equip:'❄', low_voltage:'⌒', fire_protection:'🔥',
  sitework:'⛏', paving:'▬', landscape:'🌿', fencing:'⊟',
};

export function StepSystem({ state, dispatch }: StepSystemProps) {
  const cur = state.items[state.currentItemIndex];

  const allowed = useMemo(() => allowedSystemIdsForItem(cur), [cur]);

  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: g.ids.filter((id) => allowed.has(id)).map((id) => SYSTEMS[id]).filter(Boolean),
      })).filter((g) => g.items.length > 0),
    [allowed],
  );

  const hasLocations = cur.locationTypes.length > 0;
  const locTypeLabels = [...new Set(cur.locationTypes)].map((t) => LOCATION_TYPE_LABELS[t]);

  return (
    <div>
      <div className="mb-3.5">
        <p className="text-[0.6rem] font-bold text-amber-700 uppercase tracking-[1.5px] mb-1">
          Step 2 of 6 · System
        </p>
        <h2 className="font-heading text-[1.6rem] font-black text-foreground leading-tight tracking-tight">
          What system are you working on?
        </h2>
        <p className="text-[0.78rem] text-muted-foreground mt-1 max-w-xl leading-relaxed">
          Only systems that physically exist in your selected location are shown.
        </p>
      </div>

      {!hasLocations ? (
        <div className="flex items-start gap-2.5 p-4 rounded-lg border border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="text-[0.8rem]">
            Pick a location first — that controls which systems are available here.
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            <span className="text-[0.62rem] font-bold text-muted-foreground uppercase tracking-[1.2px] mr-1">
              For:
            </span>
            {locTypeLabels.map((l) => (
              <span
                key={l}
                className="px-2 py-0.5 rounded-full bg-muted border border-border text-[0.68rem] font-semibold text-foreground/80"
              >
                {l}
              </span>
            ))}
          </div>

          {groups.map((g) => (
            <div key={g.label} className="mb-4">
              <SectionLabel>{g.label}</SectionLabel>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2">
                {g.items.map((sys) => (
                  <Tile
                    key={sys.id}
                    selected={cur.system === sys.id}
                    onClick={() =>
                      dispatch({ type: 'SET_SYSTEM', systemId: sys.id, systemName: sys.label })
                    }
                    icon={SYSTEM_ICONS[sys.id] ?? '◇'}
                    label={sys.label}
                    sub={`${sys.defaultTrade} · ${sys.scopes.length} scopes`}
                  />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
