import type { FramingScopeAnswers, MaterialResponsibility, FramingBuildingType } from '@/types/framingScope';
import { YesNoRow } from '../controls/YesNoRow';
import { ChildPanel } from '../controls/ChildPanel';
import { ScopeRadioGroup } from '../controls/ScopeRadioGroup';
import { showDraftStops, showDemising, showCorridorFireWalls } from '@/types/framingScope';
import { DT } from '@/lib/design-tokens';

interface Props {
  answers: FramingScopeAnswers;
  setAnswer: (path: string, value: any) => void;
  buildingType: FramingBuildingType;
  matResp: MaterialResponsibility | null;
}

export function FireSection({ answers, setAnswer, buildingType }: Props) {
  const f = answers.fire;

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight" style={DT.heading}>
        8. Fire & Smoke Separation
      </h2>

      <YesNoRow
        label="Fire blocking by framing crew?"
        subtitle="Required in concealed wall cavities every 10ft vertical, at floor/ceiling intersections, around penetrations (IBC 718)"
        value={f.fire_blocking}
        onChange={v => setAnswer('fire.fire_blocking', v)}
      />

      {showDraftStops(buildingType) && (
        <YesNoRow
          label="Draft stops in attic and floor cavities?"
          subtitle="IBC requires draft stops dividing attic into max 3,000 sqft compartments"
          value={f.draft_stops}
          onChange={v => setAnswer('fire.draft_stops', v)}
        />
      )}

      <ScopeRadioGroup
        label="Penetration firestopping (intumescent caulk)"
        options={[
          { value: 'BY_FRAMER', label: 'By framing crew', description: 'You apply caulk at all MEP through-penetrations' },
          { value: 'SPECIALTY_SUB', label: 'Specialty firestop sub', description: 'Not your scope — confirm GC assigns sub' },
          { value: 'SPLIT', label: 'Split scope', description: 'You install wood blocking; specialty installs sealants' },
        ]}
        value={f.firestopping}
        onChange={v => setAnswer('fire.firestopping', v)}
      />

      {showDemising(buildingType) && (
        <>
          <YesNoRow label="Demising walls (party walls between units) in scope?" value={f.demising_walls} onChange={v => setAnswer('fire.demising_walls', v)} />
          <ChildPanel parentValue={f.demising_walls}>
            <ScopeRadioGroup
              label="Demising wall type"
              options={[
                { value: 'SINGLE_STAGGERED', label: 'Single stud staggered on wide plate (Type V common)' },
                { value: 'DOUBLE_WALL', label: 'Double wall with air gap (Type III preferred)' },
                { value: 'PER_DRAWINGS', label: 'Per structural / architect drawings' },
              ]}
              value={f.demising_type}
              onChange={v => setAnswer('fire.demising_type', v)}
            />
          </ChildPanel>
        </>
      )}

      {showCorridorFireWalls(buildingType) && (
        <YesNoRow label="Corridor fire-rated wall assemblies?" value={f.corridor_fire_walls} onChange={v => setAnswer('fire.corridor_fire_walls', v)} />
      )}
    </div>
  );
}
