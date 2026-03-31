import type { FramingScopeAnswers, MaterialResponsibility, FramingBuildingType, BlockingStatus } from '@/types/framingScope';
import { BlockingTable } from '../controls/BlockingTable';
import { YesNoRow } from '../controls/YesNoRow';
import { ChildPanel } from '../controls/ChildPanel';
import { ScopeRadioGroup } from '../controls/ScopeRadioGroup';
import { isResidential, isCommercial } from '@/types/framingScope';
import { DT } from '@/lib/design-tokens';

interface Props {
  answers: FramingScopeAnswers;
  setAnswer: (path: string, value: any) => void;
  buildingType: FramingBuildingType;
  matResp: MaterialResponsibility | null;
}

const RES_STANDARD = [
  { key: 'grab_bars', label: 'Grab bars — ADA & accessible units', defaultStatus: 'IN' as BlockingStatus },
  { key: 'handrails', label: 'Stair & corridor handrails', defaultStatus: 'IN' as BlockingStatus },
  { key: 'cabinet_backing', label: 'Cabinet & millwork backing', defaultStatus: 'IN' as BlockingStatus },
  { key: 'tub_shower', label: 'Tub & shower surround blocking', defaultStatus: 'IN' as BlockingStatus },
  { key: 'shear_walls', label: 'Shear walls & hold-down anchor blocking', defaultStatus: 'IN' as BlockingStatus },
  { key: 'guard_rail', label: 'Guard rail & balcony railing blocking', defaultStatus: 'IN' as BlockingStatus },
  { key: 'tp_accessories', label: 'Toilet paper & bath accessories', defaultStatus: 'IN' as BlockingStatus },
];

const RES_OPTIONAL = [
  { key: 'tv_mount', label: 'TV / wall-mount backing' },
  { key: 'towel_bar', label: 'Towel bar & bath accessory blocking' },
  { key: 'washer_dryer', label: 'In-unit washer/dryer blocking' },
  { key: 'fire_extinguisher', label: 'Fire extinguisher cabinet backing' },
  { key: 'mailbox', label: 'Mailbox / parcel locker backing' },
  { key: 'hvac_platform', label: 'HVAC / air handler platforms' },
  { key: 'water_heater', label: 'Water heater platforms' },
  { key: 'electrical_panel', label: 'Electrical panel / sub-panel backing' },
  { key: 'special_custom', label: 'Special / custom blocking per contract exhibit' },
];

const COMMERCIAL_ITEMS = [
  { key: 'projector', label: 'Overhead projector / display screen backing' },
  { key: 'whiteboard', label: 'Marker board / whiteboard backing' },
  { key: 'casework', label: 'Casework & millwork backing' },
  { key: 'comm_restroom', label: 'Commercial restroom accessory blocking' },
  { key: 'bulletin', label: 'Bulletin board / signage backing' },
  { key: 'ada_restroom', label: 'ADA restroom fixture backing' },
];

export function BlockingSection({ answers, setAnswer, buildingType }: Props) {
  const b = answers.blocking;

  return (
    <div className="space-y-2">
      <h2 className="font-heading text-lg font-bold tracking-tight" style={DT.heading}>
        7. Blocking & Backing
      </h2>

      {isResidential(buildingType) && (
        <>
          <BlockingTable
            label="Standard Blocking (default included)"
            items={RES_STANDARD}
            values={b.residential_standard}
            onChange={v => setAnswer('blocking.residential_standard', v)}
          />
          <BlockingTable
            label="Per-Contract Blocking"
            items={RES_OPTIONAL}
            values={b.residential_optional}
            onChange={v => setAnswer('blocking.residential_optional', v)}
          />
        </>
      )}

      {isCommercial(buildingType) && (
        <BlockingTable
          label="Commercial Blocking"
          items={COMMERCIAL_ITEMS}
          values={b.commercial_items}
          onChange={v => setAnswer('blocking.commercial_items', v)}
        />
      )}

      <YesNoRow
        label="Return after MEP rough-in inspection for back-out?"
        subtitle="Back-out means returning after plumber/electrician to patch holes, add blocking, prepare for inspection"
        value={b.backout}
        onChange={v => setAnswer('blocking.backout', v)}
      />
      <ChildPanel parentValue={b.backout}>
        <ScopeRadioGroup
          label="Back-out pricing"
          options={[
            { value: 'BASE_PRICE', label: 'Included in base price' },
            { value: 'PER_UNIT', label: 'Per-unit price' },
            { value: 'TM', label: 'T&M return trip' },
          ]}
          value={b.backout_pricing}
          onChange={v => setAnswer('blocking.backout_pricing', v)}
        />
      </ChildPanel>
    </div>
  );
}
