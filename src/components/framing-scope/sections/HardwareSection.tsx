import type { FramingScopeAnswers, MaterialResponsibility, FramingBuildingType } from '@/types/framingScope';
import { YesNoRow } from '../controls/YesNoRow';
import { DT } from '@/lib/design-tokens';

interface Props {
  answers: FramingScopeAnswers;
  setAnswer: (path: string, value: any) => void;
  buildingType: FramingBuildingType;
  matResp: MaterialResponsibility | null;
}

export function HardwareSection({ answers, setAnswer, matResp }: Props) {
  const h = answers.hardware;
  const isLaborOnly = matResp === 'LABOR_ONLY';

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight" style={DT.heading}>
        9. Hardware & Connectors
      </h2>

      <YesNoRow
        label={isLaborOnly ? 'Install GC-supplied joist hangers and straps?' : 'You supply all structural connectors (Simpson, MiTek)?'}
        value={h.structural_connectors}
        onChange={v => setAnswer('hardware.structural_connectors', v)}
      />

      <YesNoRow
        label="Anchor bolt setting and mudsill installation in scope?"
        value={h.anchor_bolts}
        onChange={v => setAnswer('hardware.anchor_bolts', v)}
      />

      {answers.structure.balconies === 'yes' && (
        <YesNoRow
          label="Ledger bolts at balconies?"
          value={h.ledger_bolts}
          onChange={v => setAnswer('hardware.ledger_bolts', v)}
          showNa
        />
      )}

      <YesNoRow
        label={isLaborOnly ? 'Fasteners included in your labor rate?' : 'You supply all fasteners?'}
        value={h.fasteners}
        onChange={v => setAnswer('hardware.fasteners', v)}
      />
    </div>
  );
}
