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

export function DryinSection({ answers, setAnswer }: Props) {
  const d = answers.dryin;

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight">
        10. Dry-in, Hoisting & Temporary Protection
      </h2>

      <ScopeRadioGroup
        label="Hoisting and material handling"
        options={[
          { value: 'YOU_ALL', label: 'You provide crane, boom lift, and fork — all hoisting costs' },
          { value: 'GC_CRANE', label: 'GC provides crane — you coordinate lifts and schedule' },
          { value: 'SHARED', label: 'Shared — you provide boom lifts; GC provides crane' },
          { value: 'LABOR_ONLY', label: 'Labor only — all hoisting by GC / separate equipment sub' },
        ]}
        value={d.hoisting}
        onChange={v => setAnswer('dryin.hoisting', v)}
      />

      <YesNoRow
        label="Temporary tarps and weather protection?"
        subtitle="Cover open floor systems and openings end of shift"
        value={d.temp_tarps}
        onChange={v => setAnswer('dryin.temp_tarps', v)}
      />

      <YesNoRow
        label="Lumber storage protection?"
        subtitle="Cover unused lumber daily; framer responsible for warped lumber"
        value={d.lumber_storage}
        onChange={v => setAnswer('dryin.lumber_storage', v)}
      />
    </div>
  );
}
