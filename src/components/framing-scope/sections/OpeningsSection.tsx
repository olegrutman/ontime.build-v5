import type { FramingScopeAnswers, MaterialResponsibility, FramingBuildingType } from '@/types/framingScope';
import { YesNoRow } from '../controls/YesNoRow';
import { ChildPanel } from '../controls/ChildPanel';
import { ScopeRadioGroup } from '../controls/ScopeRadioGroup';
import { showTuckUnder } from '@/types/framingScope';
import { DT } from '@/lib/design-tokens';

interface Props {
  answers: FramingScopeAnswers;
  setAnswer: (path: string, value: any) => void;
  buildingType: FramingBuildingType;
  matResp: MaterialResponsibility | null;
}

function openingRadio(matResp: MaterialResponsibility | null) {
  const opts = [
    { value: 'GFCI', label: 'GC-furnished, contractor-installed', description: 'You set, shim, flash, nail — GC buys' },
    { value: 'RO_ONLY', label: 'Rough openings only — install by others' },
    { value: 'NOT_IN_SCOPE', label: 'Not in scope' },
  ];
  if (matResp !== 'LABOR_ONLY') {
    opts.splice(1, 0, { value: 'CFCI', label: 'Contractor-furnished & installed', description: 'You buy and install' });
  }
  return opts;
}

export function OpeningsSection({ answers, setAnswer, buildingType, matResp }: Props) {
  const o = answers.openings;
  const hasGarages = showTuckUnder(buildingType) && answers.structure.tuck_under_garages === 'yes';

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight">
        6. Openings
      </h2>

      <ScopeRadioGroup label="Window installation" options={openingRadio(matResp)} value={o.window_mode} onChange={v => setAnswer('openings.window_mode', v)} />
      {(o.window_mode === 'GFCI' || o.window_mode === 'CFCI') && (
        <ChildPanel parentValue="yes">
          <YesNoRow label="Self-adhering pan flashing tape at all sill pans?" value={o.window_pan_flashing} onChange={v => setAnswer('openings.window_pan_flashing', v)} />
          <YesNoRow label="Head flashing at all window heads?" value={o.window_head_flashing} onChange={v => setAnswer('openings.window_head_flashing', v)} />
          <YesNoRow label="Foam seal between frame and rough opening?" value={o.window_foam_seal} onChange={v => setAnswer('openings.window_foam_seal', v)} />
        </ChildPanel>
      )}

      <ScopeRadioGroup label="Exterior swing doors" subtitle="Entry, unit, and corridor doors" options={openingRadio(matResp)} value={o.ext_door_mode} onChange={v => setAnswer('openings.ext_door_mode', v)} />
      {(o.ext_door_mode === 'GFCI' || o.ext_door_mode === 'CFCI') && (
        <ChildPanel parentValue="yes">
          <YesNoRow label="Door hardware (locksets, hinges) in scope?" subtitle="Almost never the framer's scope" value={o.door_hardware} onChange={v => setAnswer('openings.door_hardware', v)} />
        </ChildPanel>
      )}

      <YesNoRow label="Patio doors / sliding glass doors in scope?" value={o.patio_doors} onChange={v => setAnswer('openings.patio_doors', v)} />
      <ChildPanel parentValue={o.patio_doors}>
        <ScopeRadioGroup label="Patio door mode" options={openingRadio(matResp)} value={o.patio_door_mode} onChange={v => setAnswer('openings.patio_door_mode', v)} />
      </ChildPanel>

      {hasGarages && (
        <>
          <YesNoRow label="Overhead / garage doors" value={o.overhead_doors} onChange={v => setAnswer('openings.overhead_doors', v)} showNa />
          <ChildPanel parentValue={o.overhead_doors}>
            <ScopeRadioGroup
              label="Overhead door scope"
              options={[
                { value: 'BUCKS_ONLY', label: 'Bucks & header only (door by others)' },
                { value: 'FULL_INSTALL', label: 'Full install including door opener rough-in' },
              ]}
              value={o.overhead_door_type}
              onChange={v => setAnswer('openings.overhead_door_type', v)}
            />
          </ChildPanel>
        </>
      )}

      <YesNoRow label="Do window/door configurations vary by elevation?" value={o.elevation_variance} onChange={v => setAnswer('openings.elevation_variance', v)} />
    </div>
  );
}
