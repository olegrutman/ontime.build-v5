import type { FramingScopeAnswers, MaterialResponsibility, FramingBuildingType } from '@/types/framingScope';
import { ScopeRadioGroup } from '../controls/ScopeRadioGroup';
import { YesNoRow } from '../controls/YesNoRow';
import { ChildPanel } from '../controls/ChildPanel';
import { DT } from '@/lib/design-tokens';

interface Props {
  answers: FramingScopeAnswers;
  setAnswer: (path: string, value: any) => void;
  buildingType: FramingBuildingType;
}

export function MethodSection({ answers, setAnswer }: Props) {
  const m = answers.method;

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight">
        1. Framing Method & Material Responsibility
      </h2>

      <ScopeRadioGroup
        label="Material Responsibility"
        subtitle="This choice determines which material questions appear throughout the wizard."
        options={[
          { value: 'LABOR_ONLY', label: 'Labor Only', description: 'GC supplies all materials. You provide labor only — lower bid exposure but less control over material quality and scheduling.' },
          { value: 'FURNISH_INSTALL', label: 'Furnish & Install', description: 'You supply and install all materials. Higher bid value, full control, but you carry material cost risk and waste responsibility.' },
          { value: 'SPLIT', label: 'Split Responsibility', description: 'Some materials by you, some by GC — negotiated per category. Most flexible but requires clear scope delineation.' },
        ]}
        value={m.material_responsibility}
        onChange={v => setAnswer('method.material_responsibility', v)}
      />

      <ScopeRadioGroup
        label="Framing Method"
        options={[
          { value: 'STICK', label: 'Stick Frame', description: 'Traditional field-built framing' },
          { value: 'PANELIZED', label: 'Panelized', description: 'Pre-built wall panels delivered to site' },
          { value: 'HYBRID', label: 'Hybrid', description: 'Combination of stick-frame and panelized' },
        ]}
        value={m.framing_method}
        onChange={v => setAnswer('method.framing_method', v)}
      />

      {(m.material_responsibility === 'FURNISH_INSTALL' || m.material_responsibility === 'SPLIT') && (
        <ScopeRadioGroup
          label="Lumber Grade"
          options={[
            { value: 'SELECT_STRUCTURAL', label: 'Select Structural' },
            { value: 'NO2_BETTER', label: '#2 & Better' },
            { value: 'ENGINEERED', label: 'Engineered Lumber' },
          ]}
          value={m.lumber_grade}
          onChange={v => setAnswer('method.lumber_grade', v)}
        />
      )}

      <YesNoRow
        label="Mobilization as separate SOV line item?"
        subtitle="Bill mobilization separately from production framing"
        value={m.mobilization}
        onChange={v => setAnswer('method.mobilization', v)}
      />

      <ChildPanel parentValue={m.mobilization}>
        <div className="py-2">
          <label className="text-sm text-foreground font-medium block mb-1">
            Mobilization % of contract
          </label>
          <input
            type="number"
            min={0}
            max={20}
            step={0.5}
            value={m.mobilization_percent ?? 5}
            onChange={e => setAnswer('method.mobilization_percent', parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-1 text-sm border border-border rounded-md bg-card"
          />
          <span className="text-xs text-muted-foreground ml-2">%</span>
        </div>
      </ChildPanel>
    </div>
  );
}
