import type { FramingScopeAnswers, MaterialResponsibility, FramingBuildingType } from '@/types/framingScope';
import { YesNoRow } from '../controls/YesNoRow';
import { ChildPanel } from '../controls/ChildPanel';
import { ScopeCheckboxGroup } from '../controls/ScopeCheckboxGroup';
import { ScopeRadioGroup } from '../controls/ScopeRadioGroup';
import { showElevator, showCorridors, showBreezeways, showCommunitySpaces, showBalconies, showTuckUnder } from '@/types/framingScope';
import { DT } from '@/lib/design-tokens';

interface Props {
  answers: FramingScopeAnswers;
  setAnswer: (path: string, value: any) => void;
  buildingType: FramingBuildingType;
  matResp: MaterialResponsibility | null;
}

export function StructureSection({ answers, setAnswer, buildingType, matResp }: Props) {
  const s = answers.structure;

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight">
        2. Building Features
      </h2>

      <YesNoRow label="Wood stairs" subtitle="Stringers, landings, treads" value={s.wood_stairs} onChange={v => setAnswer('structure.wood_stairs', v)} showNa />
      <ChildPanel parentValue={s.wood_stairs}>
        <ScopeCheckboxGroup
          label="Stair scope items"
          options={[
            { value: 'stringers', label: 'Stringers & rough structure' },
            { value: 'landings', label: 'Landings & platforms' },
            { value: 'treads', label: 'Treads & risers (finished)' },
            { value: 'guardrail', label: 'Guardrail rough structure' },
            { value: 'handrail_backing', label: 'Handrail backing at walls' },
          ]}
          selected={s.stairs_items}
          onChange={v => setAnswer('structure.stairs_items', v)}
        />
      </ChildPanel>

      {showElevator(buildingType) && (
        <>
          <YesNoRow label="Elevator shaft" subtitle="Hoistway walls, pit framing, machine room" value={s.elevator_shaft} onChange={v => setAnswer('structure.elevator_shaft', v)} showNa />
          <ChildPanel parentValue={s.elevator_shaft}>
            <ScopeCheckboxGroup
              label="Elevator scope items"
              options={[
                { value: 'hoistway', label: 'Hoistway walls full height' },
                { value: 'pit', label: 'Pit framing & sump blocking' },
                { value: 'machine_room', label: 'Machine room / penthouse' },
                { value: 'door_bucks', label: 'Door sill bucks each level' },
              ]}
              selected={s.elevator_items}
              onChange={v => setAnswer('structure.elevator_items', v)}
            />
          </ChildPanel>
        </>
      )}

      {showCorridors(buildingType) && (
        <YesNoRow label="Enclosed interior corridors" value={s.enclosed_corridors} onChange={v => setAnswer('structure.enclosed_corridors', v)} showNa />
      )}

      {showBreezeways(buildingType) && (
        <YesNoRow label="Open breezeways / exterior walkways" value={s.open_breezeways} onChange={v => setAnswer('structure.open_breezeways', v)} showNa />
      )}

      {showCommunitySpaces(buildingType) && (
        <YesNoRow label="Community / amenity spaces" subtitle="Clubhouse, gym, leasing office, mail room" value={s.community_spaces} onChange={v => setAnswer('structure.community_spaces', v)} showNa />
      )}

      {showBalconies(buildingType) && (
        <>
          <YesNoRow label="Balconies" value={s.balconies} onChange={v => setAnswer('structure.balconies', v)} showNa />
          <ChildPanel parentValue={s.balconies}>
            <ScopeRadioGroup
              label="Balcony type"
              options={[
                { value: 'CANTILEVER', label: 'Cantilever' },
                { value: 'LEDGER_BRACKET', label: 'Ledger bracket' },
                { value: 'BOTH', label: 'Both' },
              ]}
              value={s.balcony_type}
              onChange={v => setAnswer('structure.balcony_type', v)}
            />
            <ScopeCheckboxGroup
              label="Balcony scope items"
              options={[
                { value: 'guardrail', label: 'Guardrail rough structure' },
                { value: 'waterproof', label: 'Waterproof deck backing/nailers' },
                ...(matResp !== 'LABOR_ONLY' ? [{ value: 'ledger_bolts', label: 'Ledger bolts' }] : []),
              ]}
              selected={s.balcony_items}
              onChange={v => setAnswer('structure.balcony_items', v)}
            />
          </ChildPanel>
        </>
      )}

      <YesNoRow label="Ground-level patios" value={s.ground_patios} onChange={v => setAnswer('structure.ground_patios', v)} showNa />

      {showTuckUnder(buildingType) && (
        <>
          <YesNoRow label="Tuck-under / attached garages" value={s.tuck_under_garages} onChange={v => setAnswer('structure.tuck_under_garages', v)} showNa />
          <ChildPanel parentValue={s.tuck_under_garages}>
            <ScopeCheckboxGroup
              label="Garage scope items"
              options={[
                { value: 'oh_door_bucks', label: 'Overhead door bucks & header' },
                { value: 'fire_wall', label: 'Fire separation wall (1-hr)' },
                { value: 'drip_ledge', label: 'Drip ledge framing' },
                { value: 'hvac_platforms', label: 'HVAC/utility platforms' },
              ]}
              selected={s.garage_items}
              onChange={v => setAnswer('structure.garage_items', v)}
            />
          </ChildPanel>
        </>
      )}
    </div>
  );
}
