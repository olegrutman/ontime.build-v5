import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { SOVLivePreview } from './SOVLivePreview';
import {
  BUILDING_SCOPE_LABEL,
  BUILDING_SCOPE_HINT,
  EXTERIOR_WALL_LABEL,
  ROOF_STRUCTURE_LABEL,
  INTERIOR_PARTITION_LABEL,
  ENVELOPE_LAYER_LABEL,
  GROUND_FLOOR_LABEL,
  UPPER_FLOOR_LABEL,
  presetForBuildingScope,
  resolveScopeBoundaries,
  type Answers,
  type BuildingType,
  type BuildingScopeType,
  type ExteriorWallsScope,
  type RoofStructureScope,
  type InteriorPartitionsScope,
  type EnvelopeLayer,
  type GroundFloorScope,
  type UpperFloorScope,
  type ScopeBoundaries,
  type SOVLine,
} from '@/hooks/useSetupWizardV2';

interface Props {
  buildingType: BuildingType | null;
  answers: Answers;
  setAnswer: (key: string, value: any) => void;
  sovLines: SOVLine[];
}

const BUILDING_SCOPE_OPTIONS: BuildingScopeType[] = [
  'complete', 'shell_only', 'interior_only', 'addition_vertical', 'addition_horizontal', 'specific',
];
const EXT_WALL_OPTIONS: ExteriorWallsScope[] = [
  'self', 'by_others_concrete', 'by_others_cmu', 'by_others_tilt', 'by_others_steel', 'na',
];
const ROOF_OPTIONS: RoofStructureScope[] = ['trusses', 'rafters', 'steel_joist', 'by_others'];
const INTERIOR_OPTIONS: InteriorPartitionsScope[] = ['full', 'partial', 'none'];
const ENV_OPTIONS: EnvelopeLayer[] = ['sheathing', 'wrb', 'insulation', 'siding'];
const GROUND_OPTIONS: GroundFloorScope[] = ['framed_self', 'slab_by_others', 'podium_by_others', 'na'];
const UPPER_OPTIONS: UpperFloorScope[] = ['framed_self', 'ijoist_self', 'steel_by_others', 'concrete_by_others', 'na'];

export function ScopeBoundariesPanel({ buildingType, answers, setAnswer, sovLines }: Props) {
  const sb = useMemo(() => resolveScopeBoundaries(answers), [answers]);

  // Resolve story count from earlier wizard answers (mirrors generator logic)
  const storyCount = useMemo(() => {
    const v = answers?.stories;
    if (typeof v === 'number') return Math.max(1, v);
    if (v === '2-story' || v === '2') return 2;
    if (v === '3') return 3;
    if (v === 'Mix of both') return 2;
    if (v === '1-story') return 1;
    return 1;
  }, [answers]);

  const update = (patch: Partial<ScopeBoundaries>) => {
    setAnswer('scope_boundaries', { ...sb, ...patch });
  };

  const pickBuildingScope = (scope: BuildingScopeType) => {
    setAnswer('scope_boundaries', { ...sb, building_scope: scope, ...presetForBuildingScope(scope) });
  };

  const toggleLayer = (layer: EnvelopeLayer) => {
    const next = sb.envelope_layers.includes(layer)
      ? sb.envelope_layers.filter(l => l !== layer)
      : [...sb.envelope_layers, layer];
    update({ envelope_layers: next });
  };

  const toggleFloor = (n: number) => {
    const current = sb.framed_floors ?? Array.from({ length: storyCount }, (_, i) => i + 1);
    const next = current.includes(n) ? current.filter(x => x !== n) : [...current, n].sort((a, b) => a - b);
    update({ framed_floors: next.length === storyCount ? null : next });
  };

  const extByOthers = sb.exterior_walls !== 'self' && sb.exterior_walls !== 'na';
  const roofInScope = sb.roof_structure !== 'by_others';
  const showFloorSubset = sb.building_scope !== 'complete' && storyCount > 1;

  const Section = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
    <div className="space-y-2.5">
      <div>
        <h3 className="font-heading text-sm font-bold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );

  const Tile = ({
    active, onClick, label, hint,
  }: { active: boolean; onClick: () => void; label: string; hint?: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg border transition-all',
        active
          ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
          : 'border-border bg-card hover:border-primary/40 hover:bg-muted/20',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        {active && <Check className="w-4 h-4 text-primary shrink-0" />}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
    </button>
  );

  const framedSet = sb.framed_floors ?? Array.from({ length: storyCount }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: boundary questions */}
      <div className="space-y-5">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">
            What are you actually building?
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Start with the overall picture, then fine-tune. We'll skip line items for work
            someone else is doing so your SOV reflects only your scope.
          </p>
        </div>

        <Section title="Building scope" subtitle="Pick the closest match — it pre-fills the questions below">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {BUILDING_SCOPE_OPTIONS.map(opt => (
              <Tile
                key={opt}
                active={sb.building_scope === opt}
                onClick={() => pickBuildingScope(opt)}
                label={BUILDING_SCOPE_LABEL[opt]}
                hint={BUILDING_SCOPE_HINT[opt]}
              />
            ))}
          </div>
        </Section>

        <Section title="Exterior walls" subtitle="Who is framing the exterior wall structure?">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXT_WALL_OPTIONS.map(opt => (
              <Tile
                key={opt}
                active={sb.exterior_walls === opt}
                onClick={() => update({ exterior_walls: opt })}
                label={EXTERIOR_WALL_LABEL[opt]}
              />
            ))}
          </div>
        </Section>

        <Section title="Floors — ground floor" subtitle="Slab-on-grade, framed deck, or concrete podium?">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GROUND_OPTIONS.map(opt => (
              <Tile
                key={opt}
                active={sb.ground_floor === opt}
                onClick={() => update({ ground_floor: opt })}
                label={GROUND_FLOOR_LABEL[opt]}
              />
            ))}
          </div>
        </Section>

        {storyCount > 1 && (
          <Section title="Floors — upper floors" subtitle="How are floors 2 and above being built?">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {UPPER_OPTIONS.map(opt => (
                <Tile
                  key={opt}
                  active={sb.upper_floors === opt}
                  onClick={() => update({ upper_floors: opt })}
                  label={UPPER_FLOOR_LABEL[opt]}
                />
              ))}
            </div>
          </Section>
        )}

        {showFloorSubset && (
          <Section
            title="Which floors are you framing?"
            subtitle="Uncheck any floor that's out of scope (e.g. vertical addition = 2nd floor + roof only)"
          >
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: storyCount }, (_, i) => i + 1).map(n => {
                const active = framedSet.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggleFloor(n)}
                    className={cn(
                      'px-3 py-1.5 rounded-md border text-sm font-medium transition-all',
                      active
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                    )}
                  >
                    {active && <Check className="w-3 h-3 inline mr-1" />}
                    Level {n}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        <Section title="Stair framing" subtitle="Wood stair towers and framed landings">
          <div className="grid grid-cols-2 gap-2">
            <Tile active={sb.stair_framing} onClick={() => update({ stair_framing: true })} label="In my scope" />
            <Tile active={!sb.stair_framing} onClick={() => update({ stair_framing: false })} label="By others" />
          </div>
        </Section>

        <Section title="Interior partitions" subtitle="Are you framing interior walls?">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {INTERIOR_OPTIONS.map(opt => (
              <Tile
                key={opt}
                active={sb.interior_partitions === opt}
                onClick={() => update({ interior_partitions: opt })}
                label={INTERIOR_PARTITION_LABEL[opt]}
              />
            ))}
          </div>
        </Section>

        <Section title="Roof structure" subtitle="Roof framing & sheathing scope">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ROOF_OPTIONS.map(opt => (
              <Tile
                key={opt}
                active={sb.roof_structure === opt}
                onClick={() => update({ roof_structure: opt })}
                label={ROOF_STRUCTURE_LABEL[opt]}
              />
            ))}
          </div>
        </Section>

        {roofInScope && (
          <Section title="Roof covering" subtitle="Shingles, membrane, metal roofing">
            <div className="grid grid-cols-2 gap-2">
              <Tile active={sb.roof_covering} onClick={() => update({ roof_covering: true })} label="In my scope" />
              <Tile active={!sb.roof_covering} onClick={() => update({ roof_covering: false })} label="By others" />
            </div>
          </Section>
        )}

        {extByOthers && (
          <Section
            title="Envelope layers"
            subtitle="Even though the walls are by others, which layers are you installing?"
          >
            <div className="grid grid-cols-2 gap-2">
              {ENV_OPTIONS.map(opt => (
                <Tile
                  key={opt}
                  active={sb.envelope_layers.includes(opt)}
                  onClick={() => toggleLayer(opt)}
                  label={ENVELOPE_LAYER_LABEL[opt]}
                />
              ))}
            </div>
          </Section>
        )}

        <Section title="MEP backout & interior blocking" subtitle="Coordination with mechanical, electrical, plumbing">
          <div className="grid grid-cols-2 gap-2">
            <Tile active={sb.mep_backout} onClick={() => update({ mep_backout: true })} label="In my scope" />
            <Tile active={!sb.mep_backout} onClick={() => update({ mep_backout: false })} label="By others" />
          </div>
        </Section>

        <div className="p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
          <strong className="text-foreground">Live preview →</strong> The SOV on the right updates
          instantly. Excluded scope appears struck-through under <em>"By others / not in scope"</em>
          {' '}so nothing is silently dropped.
        </div>
      </div>

      {/* Right: live SOV preview */}
      <div className="border border-border rounded-lg overflow-hidden bg-card flex flex-col h-[calc(100vh-280px)]">
        <SOVLivePreview lines={sovLines} buildingType={buildingType} />
      </div>
    </div>
  );
}
