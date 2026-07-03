import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { SOVLivePreview } from './SOVLivePreview';
import {
  DEFAULT_SCOPE_BOUNDARIES,
  EXTERIOR_WALL_LABEL,
  ROOF_STRUCTURE_LABEL,
  INTERIOR_PARTITION_LABEL,
  ENVELOPE_LAYER_LABEL,
  resolveScopeBoundaries,
  type Answers,
  type BuildingType,
  type ExteriorWallsScope,
  type RoofStructureScope,
  type InteriorPartitionsScope,
  type EnvelopeLayer,
  type ScopeBoundaries,
  type SOVLine,
} from '@/hooks/useSetupWizardV2';

interface Props {
  buildingType: BuildingType | null;
  answers: Answers;
  setAnswer: (key: string, value: any) => void;
  sovLines: SOVLine[];
}

const EXT_WALL_OPTIONS: ExteriorWallsScope[] = [
  'self', 'by_others_concrete', 'by_others_cmu', 'by_others_tilt', 'by_others_steel', 'na',
];
const ROOF_OPTIONS: RoofStructureScope[] = ['trusses', 'rafters', 'steel_joist', 'by_others'];
const INTERIOR_OPTIONS: InteriorPartitionsScope[] = ['full', 'partial', 'none'];
const ENV_OPTIONS: EnvelopeLayer[] = ['sheathing', 'wrb', 'insulation', 'siding'];

export function ScopeBoundariesPanel({ buildingType, answers, setAnswer, sovLines }: Props) {
  const sb = useMemo(() => resolveScopeBoundaries(answers), [answers]);

  const update = (patch: Partial<ScopeBoundaries>) => {
    setAnswer('scope_boundaries', { ...sb, ...patch });
  };

  const toggleLayer = (layer: EnvelopeLayer) => {
    const next = sb.envelope_layers.includes(layer)
      ? sb.envelope_layers.filter(l => l !== layer)
      : [...sb.envelope_layers, layer];
    update({ envelope_layers: next });
  };

  const extByOthers = sb.exterior_walls !== 'self' && sb.exterior_walls !== 'na';
  const roofInScope = sb.roof_structure !== 'by_others';

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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: boundary questions */}
      <div className="space-y-5">
        <div>
          <h2 className="font-heading text-lg font-bold text-foreground">
            What are you actually building?
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Tell us which systems are in your scope so we don't generate line items for work
            someone else is doing. You can change any answer later.
          </p>
        </div>

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
