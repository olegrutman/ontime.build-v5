import type { FramingScopeAnswers, MaterialResponsibility, FramingBuildingType } from '@/types/framingScope';
import { YesNoRow } from '../controls/YesNoRow';
import { ChildPanel } from '../controls/ChildPanel';
import { ScopeRadioGroup } from '../controls/ScopeRadioGroup';
import {
  showMomentFrames, showSteelDecking, showShearPlates, showSteelStairs,
  showErectionMethod, showWelding, showFireproofing,
} from '@/types/framingScope';
import { DT } from '@/lib/design-tokens';

interface Props {
  answers: FramingScopeAnswers;
  setAnswer: (path: string, value: any) => void;
  buildingType: FramingBuildingType;
  matResp: MaterialResponsibility | null;
}

export function SteelSection({ answers, setAnswer, buildingType }: Props) {
  const s = answers.steel;

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight">
        3. Structural Steel
      </h2>

      <YesNoRow label="Steel columns" subtitle="W-shape, HSS, pipe columns" value={s.steel_columns} onChange={v => setAnswer('steel.steel_columns', v)} showNa />
      <ChildPanel parentValue={s.steel_columns}>
        <ScopeRadioGroup
          label="Column type"
          options={[
            { value: 'W_SHAPE', label: 'W-shape (wide flange)' },
            { value: 'HSS', label: 'HSS (hollow structural section)' },
            { value: 'PIPE', label: 'Pipe column' },
            { value: 'MIXED', label: 'Mixed / per plan' },
          ]}
          value={s.steel_column_type}
          onChange={v => setAnswer('steel.steel_column_type', v)}
        />
      </ChildPanel>

      <YesNoRow label="Steel beams" subtitle="W-shape, LVL/steel hybrid" value={s.steel_beams} onChange={v => setAnswer('steel.steel_beams', v)} showNa />
      <ChildPanel parentValue={s.steel_beams}>
        <ScopeRadioGroup
          label="Beam type"
          options={[
            { value: 'W_SHAPE', label: 'W-shape (wide flange)' },
            { value: 'LVL_HYBRID', label: 'LVL / steel hybrid' },
            { value: 'MIXED', label: 'Mixed / per plan' },
          ]}
          value={s.beam_type}
          onChange={v => setAnswer('steel.beam_type', v)}
        />
      </ChildPanel>

      <YesNoRow label="Steel posts" subtitle="Structural steel posts & columns" value={s.steel_posts} onChange={v => setAnswer('steel.steel_posts', v)} showNa />
      <ChildPanel parentValue={s.steel_posts}>
        <YesNoRow label="Post base plates" subtitle="Supply & install base plates" value={s.post_base_plates} onChange={v => setAnswer('steel.post_base_plates', v)} />
      </ChildPanel>

      <YesNoRow label="Lintels" subtitle="Angle iron, C-channel, or plate lintels" value={s.lintels} onChange={v => setAnswer('steel.lintels', v)} showNa />
      <ChildPanel parentValue={s.lintels}>
        <ScopeRadioGroup
          label="Lintel type"
          options={[
            { value: 'ANGLE_IRON', label: 'Angle iron' },
            { value: 'C_CHANNEL', label: 'C-channel' },
            { value: 'PLATE', label: 'Steel plate' },
            { value: 'MIXED', label: 'Mixed / per plan' },
          ]}
          value={s.lintel_type}
          onChange={v => setAnswer('steel.lintel_type', v)}
        />
      </ChildPanel>

      {showMomentFrames(buildingType) && (
        <>
          <YesNoRow label="Moment frames" subtitle="Rigid frame connections for lateral resistance" value={s.moment_frames} onChange={v => setAnswer('steel.moment_frames', v)} showNa />
          <ChildPanel parentValue={s.moment_frames}>
            <ScopeRadioGroup
              label="Connection type"
              options={[
                { value: 'BOLTED', label: 'Bolted connections' },
                { value: 'WELDED', label: 'Welded connections' },
                { value: 'BOTH', label: 'Both bolted & welded' },
              ]}
              value={s.moment_frame_connections}
              onChange={v => setAnswer('steel.moment_frame_connections', v)}
            />
          </ChildPanel>
        </>
      )}

      {showSteelDecking(buildingType) && (
        <>
          <YesNoRow label="Steel decking" subtitle="Metal floor/roof decking" value={s.steel_decking} onChange={v => setAnswer('steel.steel_decking', v)} showNa />
          <ChildPanel parentValue={s.steel_decking}>
            <ScopeRadioGroup
              label="Decking gauge"
              options={[
                { value: '22GA', label: '22 gauge' },
                { value: '20GA', label: '20 gauge' },
                { value: '18GA', label: '18 gauge' },
                { value: 'PER_PLAN', label: 'Per plan' },
              ]}
              value={s.decking_gauge}
              onChange={v => setAnswer('steel.decking_gauge', v)}
            />
          </ChildPanel>
        </>
      )}

      {showShearPlates(buildingType) && (
        <>
          <YesNoRow label="Shear / transfer plates" subtitle="Embed plates, shear lugs" value={s.shear_plates} onChange={v => setAnswer('steel.shear_plates', v)} showNa />
          <YesNoRow label="Embed plates" subtitle="Cast-in-place or post-installed" value={s.embed_plates} onChange={v => setAnswer('steel.embed_plates', v)} showNa />
        </>
      )}

      {showSteelStairs(buildingType) && (
        <>
          <YesNoRow label="Steel stairs" subtitle="Fabricated steel stair assemblies" value={s.steel_stairs} onChange={v => setAnswer('steel.steel_stairs', v)} showNa />
          <YesNoRow label="Steel railings" subtitle="Structural steel railings & guardrails" value={s.steel_railings} onChange={v => setAnswer('steel.steel_railings', v)} showNa />
        </>
      )}

      {showErectionMethod(buildingType) && (
        <ScopeRadioGroup
          label="Erection method"
          subtitle="How will steel be set in place?"
          options={[
            { value: 'CRANE', label: 'Crane' },
            { value: 'FORKLIFT', label: 'Forklift / telehandler' },
            { value: 'MANUAL', label: 'Manual / hand-set' },
            { value: 'MIXED', label: 'Mixed methods' },
          ]}
          value={s.erection_method}
          onChange={v => setAnswer('steel.erection_method', v)}
        />
      )}

      {showWelding(buildingType) && (
        <>
          <YesNoRow label="Torque bolting" subtitle="High-strength bolt tensioning" value={s.torque_bolting} onChange={v => setAnswer('steel.torque_bolting', v)} showNa />
          <YesNoRow label="On-site welding" subtitle="Field welding of connections" value={s.welding_onsite} onChange={v => setAnswer('steel.welding_onsite', v)} showNa />
        </>
      )}

      {showFireproofing(buildingType) && (
        <>
          <YesNoRow label="Fireproofing" subtitle="Applied fire protection on steel" value={s.fireproofing} onChange={v => setAnswer('steel.fireproofing', v)} showNa />
          <ChildPanel parentValue={s.fireproofing}>
            <ScopeRadioGroup
              label="Fireproofing type"
              options={[
                { value: 'INTUMESCENT', label: 'Intumescent coating' },
                { value: 'SPRAY_APPLIED', label: 'Spray-applied (SFRM)' },
                { value: 'BOARD', label: 'Board / wrap' },
              ]}
              value={s.fireproofing_type}
              onChange={v => setAnswer('steel.fireproofing_type', v)}
            />
          </ChildPanel>
        </>
      )}

      <YesNoRow label="Touch-up paint" subtitle="Field touch-up of galvanized or painted steel" value={s.touch_up_paint} onChange={v => setAnswer('steel.touch_up_paint', v)} showNa />
    </div>
  );
}
