import type { FramingScopeAnswers, MaterialResponsibility, FramingBuildingType } from '@/types/framingScope';
import { YesNoRow } from '../controls/YesNoRow';
import { ChildPanel } from '../controls/ChildPanel';
import { ScopeCheckboxGroup } from '../controls/ScopeCheckboxGroup';
import { ScopeRadioGroup } from '../controls/ScopeRadioGroup';
import { DT } from '@/lib/design-tokens';

interface Props {
  answers: FramingScopeAnswers;
  setAnswer: (path: string, value: any) => void;
  buildingType: FramingBuildingType;
  matResp: MaterialResponsibility | null;
}

const SIDING_TYPES = [
  { value: 'FIBER_CEMENT_LAP', label: 'Fiber cement lap siding (HardiePlank)' },
  { value: 'FIBER_CEMENT_PANEL', label: 'Fiber cement panel siding (HardiePanel)' },
  { value: 'LP_LAP', label: 'LP SmartSide lap siding' },
  { value: 'LP_PANEL', label: 'LP SmartSide panel siding' },
  { value: 'LP_BOARD_BATTEN', label: 'LP SmartSide vertical board & batten' },
  { value: 'ENGINEERED_OTHER', label: 'Engineered wood siding (other brand)' },
  { value: 'VINYL', label: 'Vinyl siding' },
  { value: 'EIFS', label: 'EIFS (Dryvit, Parex, STO)' },
  { value: 'STUCCO', label: 'Traditional stucco (3-coat)' },
  { value: 'STONE_VENEER', label: 'Stone veneer / manufactured stone' },
  { value: 'BRICK', label: 'Brick (ties / backup only)' },
  { value: 'METAL_PANEL', label: 'Metal / aluminum panel system' },
  { value: 'CEDAR_LAP', label: 'Cedar / wood lap siding' },
  { value: 'OTHER', label: 'Other' },
];

const TRIM_MATERIALS = [
  { value: 'PVC', label: 'PVC trim (Azek, Versatex, Kleer)' },
  { value: 'FIBER_CEMENT', label: 'Fiber cement trim (HardieTrim)' },
  { value: 'CEDAR', label: 'Cedar / wood (finger-jointed or clear)' },
  { value: 'MATCH_SIDING', label: 'Match siding system trim package' },
];

export function SidingSection({ answers, setAnswer, buildingType, matResp }: Props) {
  const sd = answers.siding;
  const isLaborOnly = matResp === 'LABOR_ONLY';
  const isMulti = buildingType === 'MULTI_FAMILY' || buildingType === 'HOTEL';

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight" style={DT.heading}>
        5. Siding & Exterior Cladding
      </h2>

      <YesNoRow label="Is siding / exterior cladding in your scope?" value={sd.siding_in_scope} onChange={v => setAnswer('siding.siding_in_scope', v)} />

      {sd.siding_in_scope === 'yes' && (
        <>
          <ScopeCheckboxGroup
            label="Siding type(s)"
            subtitle="Select all that apply — multiple types common on mixed elevations"
            options={SIDING_TYPES}
            selected={sd.siding_types}
            onChange={v => setAnswer('siding.siding_types', v)}
            columns={2}
          />

          {isMulti ? (
            <ScopeRadioGroup
              label="Elevation scope"
              options={[
                { value: 'ALL_ALL', label: 'All elevations on all buildings' },
                { value: 'ALL_SELECT', label: 'All elevations on select buildings only' },
                { value: 'PER_BUILDING', label: 'Select elevations per building' },
                { value: 'PER_DRAWINGS', label: 'Per drawings — match elevation schedule' },
              ]}
              value={sd.elevations_mode}
              onChange={v => setAnswer('siding.elevations_mode', v)}
            />
          ) : (
            <ScopeCheckboxGroup
              label="Which elevations are in your scope?"
              options={[
                { value: 'FRONT', label: 'Front elevation' },
                { value: 'REAR', label: 'Rear elevation' },
                { value: 'LEFT', label: 'Left side' },
                { value: 'RIGHT', label: 'Right side' },
                { value: 'ALL', label: 'All four sides' },
              ]}
              selected={sd.elevation_selections}
              onChange={v => setAnswer('siding.elevation_selections', v)}
            />
          )}

          <YesNoRow label="Exterior window casing / trim in scope?" subtitle="Wrap-around trim at each window opening" value={sd.window_trim} onChange={v => setAnswer('siding.window_trim', v)} />
          <ChildPanel parentValue={sd.window_trim}>
            {isLaborOnly ? (
              <p className="text-xs text-muted-foreground italic px-1 py-2">GC-furnished casing; you install</p>
            ) : (
              <ScopeRadioGroup label="Window trim material" options={TRIM_MATERIALS} value={sd.window_trim_material} onChange={v => setAnswer('siding.window_trim_material', v)} />
            )}
            <YesNoRow label="Head flashing / j-channel at window heads?" value={sd.head_flashing} onChange={v => setAnswer('siding.head_flashing', v)} />
            <YesNoRow label="Window sill pan / sill extension in scope?" value={sd.sill_pan} onChange={v => setAnswer('siding.sill_pan', v)} />
          </ChildPanel>

          <YesNoRow label="Corner boards / corner trim in scope?" value={sd.corner_treatment} onChange={v => setAnswer('siding.corner_treatment', v)} />
          <ChildPanel parentValue={sd.corner_treatment}>
            <ScopeRadioGroup
              label="Corner material"
              options={[
                { value: 'MATCH_SIDING', label: 'Match siding manufacturer trim system' },
                { value: 'PVC', label: 'PVC corner board' },
                { value: 'CEDAR', label: 'Cedar corner board' },
                { value: 'METAL', label: 'Metal corner bead (EIFS/stucco)' },
                { value: 'GC_SPECIFIES', label: 'GC specifies' },
              ]}
              value={sd.corner_material}
              onChange={v => setAnswer('siding.corner_material', v)}
            />
          </ChildPanel>

          <YesNoRow label="Belly band, water table, or horizontal band trim?" subtitle="Common at floor lines in multifamily" value={sd.belly_band} onChange={v => setAnswer('siding.belly_band', v)} />

          {!isLaborOnly && (
            <ScopeCheckboxGroup
              label="Siding accessories"
              options={[
                { value: 'STARTER_STRIP', label: 'Starter strip / base track' },
                { value: 'J_CHANNEL', label: 'J-channel at openings' },
                { value: 'H_CHANNEL', label: 'H-channel at panel joints' },
                { value: 'RAIN_SCREEN', label: 'Vented rain screen (1x furring)' },
                { value: 'WEEP_SCREED', label: 'Weep screed at base' },
              ]}
              selected={sd.siding_accessories}
              onChange={v => setAnswer('siding.siding_accessories', v)}
            />
          )}
        </>
      )}
    </div>
  );
}
