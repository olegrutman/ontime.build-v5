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

const FASCIA_MATERIALS = [
  { value: 'ALUMINUM', label: 'Aluminum fascia (pre-finished, .032 or .040 gauge)' },
  { value: 'PVC', label: 'PVC trim board (Azek, Versatex, Kleer)' },
  { value: 'FIBER_CEMENT', label: 'Composite / fiber cement (HardieTrim, HardieFascia)' },
  { value: 'CEDAR', label: 'Cedar / wood fascia (paint grade)' },
  { value: 'ENGINEERED', label: 'Engineered wood (LP TechShield, SmartTrim)' },
  { value: 'GC_SPECIFIES', label: 'GC-specifies / match siding system' },
];

const SOFFIT_MATERIALS = [
  { value: 'VENTED_ALUMINUM', label: 'Vented aluminum soffit' },
  { value: 'NONVENTED_ALUMINUM', label: 'Non-vented aluminum soffit (continuous)' },
  { value: 'FIBER_CEMENT', label: 'Fiber cement soffit panels (HardieSoffit)' },
  { value: 'LP_SMARTSIDE', label: 'LP SmartSide soffit panels' },
  { value: 'PLYWOOD', label: 'Plywood soffit (smooth face, paint grade)' },
  { value: 'TG_WOOD', label: 'Tongue & groove wood (cedar, pine)' },
  { value: 'GC_SPECIFIES', label: 'GC-specifies' },
];

export function ExteriorSection({ answers, setAnswer, matResp }: Props) {
  const e = answers.exterior;
  const isLaborOnly = matResp === 'LABOR_ONLY';

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight" style={DT.heading}>
        4. Fascia, Soffit & Exterior Trim
      </h2>

      <YesNoRow label="Rough fascia & eave framing in scope?" subtitle="Rough fascia board, lookout framing, eave structure" value={e.rough_fascia} onChange={v => setAnswer('exterior.rough_fascia', v)} />
      <ChildPanel parentValue={e.rough_fascia}>
        <ScopeCheckboxGroup
          label="Rough fascia items"
          options={[
            { value: 'rough_fascia_board', label: 'Rough fascia board' },
            { value: 'lookout_framing', label: 'Lookout framing at eaves' },
            { value: 'cornice_rake', label: 'Cornice / rake detail' },
            { value: 'barge_rafter', label: 'Barge rafter / fly rafter' },
          ]}
          selected={e.rough_fascia_items}
          onChange={v => setAnswer('exterior.rough_fascia_items', v)}
        />
      </ChildPanel>

      <YesNoRow label="Do you install finished fascia boards?" value={e.finished_fascia} onChange={v => setAnswer('exterior.finished_fascia', v)} />
      <ChildPanel parentValue={e.finished_fascia}>
        {isLaborOnly ? (
          <p className="text-xs text-muted-foreground italic px-1 py-2">GC-furnished; you install</p>
        ) : (
          <ScopeRadioGroup label="Finished fascia material" options={FASCIA_MATERIALS} value={e.finished_fascia_material} onChange={v => setAnswer('exterior.finished_fascia_material', v)} />
        )}
      </ChildPanel>

      <YesNoRow label="Do you install finished soffit panels?" value={e.finished_soffit} onChange={v => setAnswer('exterior.finished_soffit', v)} />
      <ChildPanel parentValue={e.finished_soffit}>
        {isLaborOnly ? (
          <p className="text-xs text-muted-foreground italic px-1 py-2">GC-furnished; you install</p>
        ) : (
          <ScopeRadioGroup label="Finished soffit material" options={SOFFIT_MATERIALS} value={e.finished_soffit_material} onChange={v => setAnswer('exterior.finished_soffit_material', v)} />
        )}
        <YesNoRow label="Vented soffit at eaves for attic ventilation?" value={e.vented_soffit} onChange={v => setAnswer('exterior.vented_soffit', v)} />
      </ChildPanel>

      <YesNoRow label="Frieze boards at top of wall / below soffit?" value={e.frieze_boards} onChange={v => setAnswer('exterior.frieze_boards', v)} />
      <ChildPanel parentValue={e.frieze_boards}>
        {!isLaborOnly && (
          <ScopeRadioGroup label="Frieze material" options={FASCIA_MATERIALS} value={e.frieze_material} onChange={v => setAnswer('exterior.frieze_material', v)} />
        )}
      </ChildPanel>

      <YesNoRow label="Window head / sill trim at roofline / eaves?" subtitle="Only covers trim at eave intersections — wall-level trim is in Siding section" value={e.eave_window_trim} onChange={v => setAnswer('exterior.eave_window_trim', v)} />
    </div>
  );
}
