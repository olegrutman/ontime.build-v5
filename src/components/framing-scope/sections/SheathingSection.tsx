import type { FramingScopeAnswers, MaterialResponsibility, FramingBuildingType } from '@/types/framingScope';
import { YesNoRow } from '../controls/YesNoRow';
import { ChildPanel } from '../controls/ChildPanel';
import { ScopeRadioGroup } from '../controls/ScopeRadioGroup';
import { DT } from '@/lib/design-tokens';

interface Props {
  answers: FramingScopeAnswers;
  setAnswer: (path: string, value: any) => void;
  buildingType: FramingBuildingType;
  matResp: MaterialResponsibility | null;
}

export function SheathingSection({ answers, setAnswer, matResp }: Props) {
  const sh = answers.sheathing;
  const isLaborOnly = matResp === 'LABOR_ONLY';

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight">
        3. Sheathing & WRB
      </h2>

      {isLaborOnly ? (
        <YesNoRow label="Do you install GC-supplied wall sheathing?" value={sh.wall_sheathing_install} onChange={v => setAnswer('sheathing.wall_sheathing_install', v)} />
      ) : (
        <ScopeRadioGroup
          label="Wall sheathing type"
          options={[
            { value: 'OSB_7_16', label: 'OSB (7/16" standard)' },
            { value: 'OSB_15_32', label: 'OSB (15/32" structural)' },
            { value: 'CDX_PLYWOOD', label: 'CDX Plywood' },
            { value: 'ZIP_SYSTEM', label: 'ZIP System® (integrated WRB)' },
            { value: 'PLYWOOD_EXT', label: 'Plywood (exterior grade)' },
            { value: 'GC_SPECIFIES', label: 'GC specifies' },
          ]}
          value={sh.wall_sheathing_type}
          onChange={v => setAnswer('sheathing.wall_sheathing_type', v)}
        />
      )}

      {/* WRB — hide if ZIP System selected */}
      {sh.wall_sheathing_type !== 'ZIP_SYSTEM' && (
        <>
          {isLaborOnly ? (
            <YesNoRow label="Do you install GC-supplied WRB?" value={sh.wrb_install} onChange={v => setAnswer('sheathing.wrb_install', v)} />
          ) : (
            <ScopeRadioGroup
              label="Weather-resistive barrier (WRB)"
              options={[
                { value: 'TYVEK_HOME', label: 'Tyvek® HomeWrap' },
                { value: 'TYVEK_COMM', label: 'DuPont™ Tyvek® CommercialWrap' },
                { value: 'FELT_30', label: '#30 Felt paper' },
                { value: 'BARRICADE', label: 'Barricade® Building Wrap' },
                { value: 'OTHER', label: 'Other (specify)' },
                { value: 'BY_OTHERS', label: 'WRB by others / not in scope' },
              ]}
              value={sh.wrb_type}
              onChange={v => setAnswer('sheathing.wrb_type', v)}
            />
          )}

          {(sh.wrb_type && sh.wrb_type !== 'BY_OTHERS') && (
            <YesNoRow label="Tape all seams at openings and penetrations?" value={sh.wrb_tape_seams} onChange={v => setAnswer('sheathing.wrb_tape_seams', v)} />
          )}
        </>
      )}

      <YesNoRow label="Roof sheathing" subtitle="Install roof deck sheathing" value={sh.roof_sheathing} onChange={v => setAnswer('sheathing.roof_sheathing', v)} />

      <YesNoRow label="Roof underlayment (dry-in)" value={sh.roof_underlayment} onChange={v => setAnswer('sheathing.roof_underlayment', v)} />
      {sh.roof_underlayment === 'yes' && !isLaborOnly && (
        <ChildPanel parentValue={sh.roof_underlayment}>
          <ScopeRadioGroup
            label="Underlayment type"
            options={[
              { value: 'FELT_15', label: '#15 felt' },
              { value: 'FELT_30', label: '#30 felt' },
              { value: 'SYNTHETIC', label: 'Synthetic (specify)' },
              { value: 'SELF_ADHERING', label: 'Self-adhering (Grace, Blueskin)' },
            ]}
            value={sh.roof_underlayment_type}
            onChange={v => setAnswer('sheathing.roof_underlayment_type', v)}
          />
        </ChildPanel>
      )}
    </div>
  );
}
