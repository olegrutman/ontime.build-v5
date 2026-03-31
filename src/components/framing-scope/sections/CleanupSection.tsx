import type { FramingScopeAnswers, MaterialResponsibility, FramingBuildingType } from '@/types/framingScope';
import { YesNoRow } from '../controls/YesNoRow';
import { ScopeRadioGroup } from '../controls/ScopeRadioGroup';
import { DT } from '@/lib/design-tokens';

interface Props {
  answers: FramingScopeAnswers;
  setAnswer: (path: string, value: any) => void;
  buildingType: FramingBuildingType;
  matResp: MaterialResponsibility | null;
}

export function CleanupSection({ answers, setAnswer }: Props) {
  const c = answers.cleanup;

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight" style={DT.heading}>
        11. Cleanup, Frame Walk & Warranty
      </h2>

      <YesNoRow label="Daily site cleanup" value={c.daily_cleanup} onChange={v => setAnswer('cleanup.daily_cleanup', v)} />
      <YesNoRow label="Final nail sweep before drywall?" subtitle="Magnetic sweeper" value={c.nail_sweep} onChange={v => setAnswer('cleanup.nail_sweep', v)} />

      <ScopeRadioGroup
        label="Dumpster responsibility"
        options={[
          { value: 'YOU', label: 'You provide dumpster' },
          { value: 'GC', label: 'GC provides dumpster' },
        ]}
        value={c.dumpster}
        onChange={v => setAnswer('cleanup.dumpster', v)}
      />

      <YesNoRow label="GC frame walk corrections" value={c.frame_walk} onChange={v => setAnswer('cleanup.frame_walk', v)} />
      <YesNoRow label="Inspection support on site during rough frame inspection" value={c.inspection_support} onChange={v => setAnswer('cleanup.inspection_support', v)} />

      <ScopeRadioGroup
        label="Warranty"
        options={[
          { value: '1_YEAR', label: '1-year workmanship' },
          { value: 'PER_CONTRACT', label: 'Per contract' },
          { value: 'NONE', label: 'Labor only / none' },
        ]}
        value={c.warranty}
        onChange={v => setAnswer('cleanup.warranty', v)}
      />
    </div>
  );
}
