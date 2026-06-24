import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronRight, 
  Home, 
  Square,
  Car,
  Columns,
  TreeDeciduous,
  Layers,
  ArrowUpDown
} from 'lucide-react';

// ============= TYPES =============

export interface BasementConfig {
  enabled: boolean;
  type: 'walkout' | 'garden_level' | 'standard' | '';
  finish: 'unfinished' | 'partial' | 'finished' | '';
}

export interface FoundationConfig {
  type: 'basement' | 'crawl_space' | 'slab_on_grade' | 'combination' | 'other' | '';
  otherText: string;
}

export interface GarageConfig {
  enabled: boolean;
  size: '1_car' | '2_car' | '3_car' | '4_plus' | '';
  type: 'attached' | 'detached' | '';
}

export interface StructuralSteelConfig {
  enabled: boolean;
  elements: {
    beams: boolean;
    columns: boolean;
    supports: boolean;
    other: boolean;
    otherText: string;
  };
  location: 'garage_attached' | 'garage_detached' | 'other' | '';
  locationOtherText: string;
}

export interface ExteriorSpacesConfig {
  enabled: boolean;
  types: {
    covered_deck: boolean;
    uncovered_deck: boolean;
    courtyard: boolean;
    balcony: boolean;
    patio: boolean;
    other: boolean;
    otherText: string;
  };
}

export interface RoofAtticConfig {
  enabled: boolean;
  roofType: 'gable' | 'hip' | 'flat' | 'shed' | 'other' | '';
  roofOtherText: string;
  attic: 'unfinished' | 'finished' | 'none_vaulted' | '';
}

export interface StairsConfig {
  enabled: boolean;
  scope: 'field_built' | 'install_only' | 'both' | 'other' | '';
  otherText: string;
}

export interface ScopeLocation {
  basement: BasementConfig;
  foundation: FoundationConfig;
  garage: GarageConfig;
  structuralSteel: StructuralSteelConfig;
  exteriorSpaces: ExteriorSpacesConfig;
  roofAttic: RoofAtticConfig;
  stairs: StairsConfig;
}

// ============= DEFAULTS =============

export const getDefaultScopeLocation = (): ScopeLocation => ({
  basement: {
    enabled: false,
    type: '',
    finish: '',
  },
  foundation: {
    type: '',
    otherText: '',
  },
  garage: {
    enabled: false,
    size: '',
    type: '',
  },
  structuralSteel: {
    enabled: false,
    elements: {
      beams: false,
      columns: false,
      supports: false,
      other: false,
      otherText: '',
    },
    location: '',
    locationOtherText: '',
  },
  exteriorSpaces: {
    enabled: false,
    types: {
      covered_deck: false,
      uncovered_deck: false,
      courtyard: false,
      balcony: false,
      patio: false,
      other: false,
      otherText: '',
    },
  },
  roofAttic: {
    enabled: false,
    roofType: '',
    roofOtherText: '',
    attic: '',
  },
  stairs: {
    enabled: false,
    scope: '',
    otherText: '',
  },
});

// ============= DISPLAY HELPERS =============

const BASEMENT_TYPES = [
  { value: 'walkout', label: 'Walkout' },
  { value: 'garden_level', label: 'Garden Level' },
  { value: 'standard', label: 'Standard' },
] as const;

const BASEMENT_FINISH = [
  { value: 'unfinished', label: 'Unfinished' },
  { value: 'partial', label: 'Partial Finish' },
  { value: 'finished', label: 'Finished' },
] as const;

const FOUNDATION_TYPES = [
  { value: 'basement', label: 'Basement' },
  { value: 'crawl_space', label: 'Crawl Space' },
  { value: 'slab_on_grade', label: 'Slab on Grade' },
  { value: 'combination', label: 'Combination' },
  { value: 'other', label: 'Other' },
] as const;

const GARAGE_SIZES = [
  { value: '1_car', label: '1-Car' },
  { value: '2_car', label: '2-Car' },
  { value: '3_car', label: '3-Car' },
  { value: '4_plus', label: '4+' },
] as const;

const GARAGE_TYPES = [
  { value: 'attached', label: 'Attached' },
  { value: 'detached', label: 'Detached' },
] as const;

const STEEL_LOCATIONS = [
  { value: 'garage_attached', label: 'Attached Garage' },
  { value: 'garage_detached', label: 'Detached Garage' },
  { value: 'other', label: 'Other' },
] as const;

const ROOF_TYPES = [
  { value: 'gable', label: 'Gable' },
  { value: 'hip', label: 'Hip' },
  { value: 'flat', label: 'Flat' },
  { value: 'shed', label: 'Shed' },
  { value: 'other', label: 'Other' },
] as const;

const ATTIC_TYPES = [
  { value: 'unfinished', label: 'Unfinished' },
  { value: 'finished', label: 'Finished' },
  { value: 'none_vaulted', label: 'None (Vaulted)' },
] as const;

const STAIRS_SCOPE = [
  { value: 'field_built', label: 'Field Built' },
  { value: 'install_only', label: 'Install Only' },
  { value: 'both', label: 'Both' },
  { value: 'other', label: 'Other' },
] as const;

// ============= COMPONENT =============

interface ScopeLocationPickerProps {
  value: ScopeLocation;
  onChange: (value: ScopeLocation) => void;
}

interface CategorySectionProps {
  title: string;
  icon: React.ElementType;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  alwaysExpanded?: boolean;
}

function CategorySection({ title, icon: Icon, enabled, onToggle, children, alwaysExpanded }: CategorySectionProps) {
  const [expanded, setExpanded] = useState(enabled);
  const showChildren = alwaysExpanded || (enabled && expanded);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => {
          if (alwaysExpanded) {
            setExpanded(!expanded);
          } else {
            onToggle();
            if (!enabled) setExpanded(true);
          }
        }}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
          enabled ? 'bg-accent/10' : 'bg-muted/30 hover:bg-muted/50'
        }`}
      >
        {!alwaysExpanded && (
          <Checkbox checked={enabled} onCheckedChange={onToggle} />
        )}
        <Icon className={`h-4 w-4 ${enabled ? 'text-accent' : 'text-muted-foreground'}`} />
        <span className={`font-medium flex-1 ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
          {title}
        </span>
        {(enabled || alwaysExpanded) && (
          showChildren 
            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {showChildren && (
        <div className="p-3 pt-0 border-t border-border bg-background space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onClick: () => void;
}

function OptionButton({ label, selected, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
        selected 
          ? 'bg-accent text-accent-foreground' 
          : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      {label}
    </button>
  );
}

export default function ScopeLocationPicker({ value, onChange }: ScopeLocationPickerProps) {
  const update = <K extends keyof ScopeLocation>(key: K, updates: Partial<ScopeLocation[K]>) => {
    onChange({
      ...value,
      [key]: { ...value[key], ...updates },
    });
  };

  return (
    <div className="space-y-3">
      {/* Foundation - Always visible, no toggle */}
      <CategorySection
        title="Foundation Type"
        icon={Square}
        enabled={true}
        onToggle={() => {}}
        alwaysExpanded
      >
        <div className="pt-3">
          <div className="flex flex-wrap gap-2">
            {FOUNDATION_TYPES.map(opt => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={value.foundation.type === opt.value}
                onClick={() => update('foundation', { 
                  type: opt.value,
                  otherText: opt.value === 'other' ? value.foundation.otherText : ''
                })}
              />
            ))}
          </div>
          {value.foundation.type === 'other' && (
            <Input
              placeholder="Describe foundation type..."
              value={value.foundation.otherText}
              onChange={(e) => update('foundation', { otherText: e.target.value })}
              className="mt-2"
            />
          )}
        </div>
      </CategorySection>

      {/* Basement */}
      <CategorySection
        title="Basement"
        icon={Home}
        enabled={value.basement.enabled}
        onToggle={() => update('basement', { enabled: !value.basement.enabled })}
      >
        <div className="pt-3 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Type</Label>
            <div className="flex flex-wrap gap-2">
              {BASEMENT_TYPES.map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={value.basement.type === opt.value}
                  onClick={() => update('basement', { type: opt.value })}
                />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Finish Level</Label>
            <div className="flex flex-wrap gap-2">
              {BASEMENT_FINISH.map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={value.basement.finish === opt.value}
                  onClick={() => update('basement', { finish: opt.value })}
                />
              ))}
            </div>
          </div>
        </div>
      </CategorySection>

      {/* Garage */}
      <CategorySection
        title="Garage"
        icon={Car}
        enabled={value.garage.enabled}
        onToggle={() => update('garage', { enabled: !value.garage.enabled })}
      >
        <div className="pt-3 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Size</Label>
            <div className="flex flex-wrap gap-2">
              {GARAGE_SIZES.map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={value.garage.size === opt.value}
                  onClick={() => update('garage', { size: opt.value })}
                />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Type</Label>
            <div className="flex flex-wrap gap-2">
              {GARAGE_TYPES.map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={value.garage.type === opt.value}
                  onClick={() => update('garage', { type: opt.value })}
                />
              ))}
            </div>
          </div>
        </div>
      </CategorySection>

      {/* Structural Steel */}
      <CategorySection
        title="Structural Steel"
        icon={Columns}
        enabled={value.structuralSteel.enabled}
        onToggle={() => update('structuralSteel', { enabled: !value.structuralSteel.enabled })}
      >
        <div className="pt-3 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Elements</Label>
            <div className="flex flex-wrap gap-2">
              {['beams', 'columns', 'supports', 'other'].map((el) => {
                const checked = value.structuralSteel.elements[el as keyof typeof value.structuralSteel.elements];
                return (
                  <button
                    key={el}
                    type="button"
                    onClick={() => update('structuralSteel', {
                      elements: {
                        ...value.structuralSteel.elements,
                        [el]: !checked
                      }
                    })}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      checked 
                        ? 'bg-accent text-accent-foreground' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {el.charAt(0).toUpperCase() + el.slice(1)}
                  </button>
                );
              })}
            </div>
            {value.structuralSteel.elements.other && (
              <Input
                placeholder="Describe other elements..."
                value={value.structuralSteel.elements.otherText}
                onChange={(e) => update('structuralSteel', {
                  elements: { ...value.structuralSteel.elements, otherText: e.target.value }
                })}
                className="mt-2"
              />
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Location</Label>
            <div className="flex flex-wrap gap-2">
              {STEEL_LOCATIONS.map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={value.structuralSteel.location === opt.value}
                  onClick={() => update('structuralSteel', { location: opt.value })}
                />
              ))}
            </div>
            {value.structuralSteel.location === 'other' && (
              <Input
                placeholder="Describe location..."
                value={value.structuralSteel.locationOtherText}
                onChange={(e) => update('structuralSteel', { locationOtherText: e.target.value })}
                className="mt-2"
              />
            )}
          </div>
        </div>
      </CategorySection>

      {/* Exterior Spaces */}
      <CategorySection
        title="Exterior Spaces"
        icon={TreeDeciduous}
        enabled={value.exteriorSpaces.enabled}
        onToggle={() => update('exteriorSpaces', { enabled: !value.exteriorSpaces.enabled })}
      >
        <div className="pt-3">
          <div className="flex flex-wrap gap-2">
            {(['covered_deck', 'uncovered_deck', 'courtyard', 'balcony', 'patio', 'other'] as const).map((t) => {
              const checked = value.exteriorSpaces.types[t];
              const label = t === 'covered_deck' ? 'Covered Deck' 
                : t === 'uncovered_deck' ? 'Uncovered Deck'
                : t.charAt(0).toUpperCase() + t.slice(1);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => update('exteriorSpaces', {
                    types: { ...value.exteriorSpaces.types, [t]: !checked }
                  })}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    checked 
                      ? 'bg-accent text-accent-foreground' 
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {value.exteriorSpaces.types.other && (
            <Input
              placeholder="Describe other exterior space..."
              value={value.exteriorSpaces.types.otherText}
              onChange={(e) => update('exteriorSpaces', {
                types: { ...value.exteriorSpaces.types, otherText: e.target.value }
              })}
              className="mt-2"
            />
          )}
        </div>
      </CategorySection>

      {/* Roof & Attic */}
      <CategorySection
        title="Roof & Attic"
        icon={Layers}
        enabled={value.roofAttic.enabled}
        onToggle={() => update('roofAttic', { enabled: !value.roofAttic.enabled })}
      >
        <div className="pt-3 space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Roof Type</Label>
            <div className="flex flex-wrap gap-2">
              {ROOF_TYPES.map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={value.roofAttic.roofType === opt.value}
                  onClick={() => update('roofAttic', { roofType: opt.value })}
                />
              ))}
            </div>
            {value.roofAttic.roofType === 'other' && (
              <Input
                placeholder="Describe roof type..."
                value={value.roofAttic.roofOtherText}
                onChange={(e) => update('roofAttic', { roofOtherText: e.target.value })}
                className="mt-2"
              />
            )}
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Attic</Label>
            <div className="flex flex-wrap gap-2">
              {ATTIC_TYPES.map(opt => (
                <OptionButton
                  key={opt.value}
                  label={opt.label}
                  selected={value.roofAttic.attic === opt.value}
                  onClick={() => update('roofAttic', { attic: opt.value })}
                />
              ))}
            </div>
          </div>
        </div>
      </CategorySection>

      {/* Stairs */}
      <CategorySection
        title="Stairs"
        icon={ArrowUpDown}
        enabled={value.stairs.enabled}
        onToggle={() => update('stairs', { enabled: !value.stairs.enabled })}
      >
        <div className="pt-3">
          <Label className="text-xs text-muted-foreground mb-1.5 block">Scope</Label>
          <div className="flex flex-wrap gap-2">
            {STAIRS_SCOPE.map(opt => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={value.stairs.scope === opt.value}
                onClick={() => update('stairs', { scope: opt.value })}
              />
            ))}
          </div>
          {value.stairs.scope === 'other' && (
            <Input
              placeholder="Describe stairs scope..."
              value={value.stairs.otherText}
              onChange={(e) => update('stairs', { otherText: e.target.value })}
              className="mt-2"
            />
          )}
        </div>
      </CategorySection>
    </div>
  );
}

// ============= CONVERSION UTILITIES =============

/**
 * Convert ScopeLocation to flat flags for storage in scope_flags JSON
 */
export function scopeLocationToFlags(scope: ScopeLocation): Record<string, boolean | string> {
  const flags: Record<string, boolean | string> = {};

  // Foundation
  if (scope.foundation.type) {
    flags.foundation_type = scope.foundation.type;
    if (scope.foundation.type === 'other' && scope.foundation.otherText) {
      flags.foundation_other = scope.foundation.otherText;
    }
  }

  // Basement
  if (scope.basement.enabled) {
    flags.basement = true;
    if (scope.basement.type) flags.basement_type = scope.basement.type;
    if (scope.basement.finish) flags.basement_finish = scope.basement.finish;
  }

  // Garage
  if (scope.garage.enabled) {
    flags.garage = true;
    if (scope.garage.size) flags.garage_size = scope.garage.size;
    if (scope.garage.type) {
      flags[`garage_${scope.garage.type}`] = true;
      flags.garage_type = scope.garage.type;
    }
  }

  // Structural Steel
  if (scope.structuralSteel.enabled) {
    flags.structural_steel = true;
    if (scope.structuralSteel.elements.beams) flags.steel_beams = true;
    if (scope.structuralSteel.elements.columns) flags.steel_columns = true;
    if (scope.structuralSteel.elements.supports) flags.steel_supports = true;
    if (scope.structuralSteel.elements.other && scope.structuralSteel.elements.otherText) {
      flags.steel_other = scope.structuralSteel.elements.otherText;
    }
    if (scope.structuralSteel.location) {
      flags.steel_location = scope.structuralSteel.location;
      if (scope.structuralSteel.location === 'other' && scope.structuralSteel.locationOtherText) {
        flags.steel_location_other = scope.structuralSteel.locationOtherText;
      }
    }
  }

  // Exterior Spaces
  if (scope.exteriorSpaces.enabled) {
    flags.exterior_spaces = true;
    if (scope.exteriorSpaces.types.covered_deck) flags.covered_deck = true;
    if (scope.exteriorSpaces.types.uncovered_deck) flags.uncovered_deck = true;
    if (scope.exteriorSpaces.types.courtyard) flags.courtyard = true;
    if (scope.exteriorSpaces.types.balcony) flags.balcony = true;
    if (scope.exteriorSpaces.types.patio) flags.patio = true;
    if (scope.exteriorSpaces.types.other && scope.exteriorSpaces.types.otherText) {
      flags.exterior_other = scope.exteriorSpaces.types.otherText;
    }
    // Legacy compat
    flags.decks = scope.exteriorSpaces.types.covered_deck || scope.exteriorSpaces.types.uncovered_deck;
  }

  // Roof & Attic
  if (scope.roofAttic.enabled) {
    flags.roof = true;
    if (scope.roofAttic.roofType) {
      flags.roof_type = scope.roofAttic.roofType;
      if (scope.roofAttic.roofType === 'other' && scope.roofAttic.roofOtherText) {
        flags.roof_other = scope.roofAttic.roofOtherText;
      }
    }
    if (scope.roofAttic.attic) {
      flags.attic = scope.roofAttic.attic !== 'none_vaulted';
      flags.attic_type = scope.roofAttic.attic;
    }
  }

  // Stairs
  if (scope.stairs.enabled) {
    flags.staircases = true;
    if (scope.stairs.scope) {
      flags.stairs_scope = scope.stairs.scope;
      if (scope.stairs.scope === 'other' && scope.stairs.otherText) {
        flags.stairs_other = scope.stairs.otherText;
      }
    }
  }

  return flags;
}

/**
 * Generate a summary of selected scope locations for display
 */
export function getScopeLocationSummary(scope: ScopeLocation): string[] {
  const summary: string[] = [];

  if (scope.foundation.type) {
    const label = FOUNDATION_TYPES.find(f => f.value === scope.foundation.type)?.label;
    summary.push(`Foundation: ${label || scope.foundation.type}`);
  }

  if (scope.basement.enabled) {
    const parts = ['Basement'];
    if (scope.basement.type) {
      const typeLabel = BASEMENT_TYPES.find(t => t.value === scope.basement.type)?.label;
      if (typeLabel) parts.push(`(${typeLabel})`);
    }
    summary.push(parts.join(' '));
  }

  if (scope.garage.enabled) {
    const parts = ['Garage'];
    const sizeLabel = GARAGE_SIZES.find(s => s.value === scope.garage.size)?.label;
    const typeLabel = GARAGE_TYPES.find(t => t.value === scope.garage.type)?.label;
    if (sizeLabel || typeLabel) {
      parts.push(`(${[sizeLabel, typeLabel].filter(Boolean).join(', ')})`);
    }
    summary.push(parts.join(' '));
  }

  if (scope.structuralSteel.enabled) {
    summary.push('Structural Steel');
  }

  if (scope.exteriorSpaces.enabled) {
    const types = Object.entries(scope.exteriorSpaces.types)
      .filter(([k, v]) => v === true && k !== 'otherText')
      .map(([k]) => k.replace('_', ' '));
    if (types.length > 0) {
      summary.push(`Exterior: ${types.slice(0, 2).join(', ')}${types.length > 2 ? '...' : ''}`);
    } else {
      summary.push('Exterior Spaces');
    }
  }

  if (scope.roofAttic.enabled) {
    summary.push('Roof & Attic');
  }

  if (scope.stairs.enabled) {
    summary.push('Stairs');
  }

  return summary;
}
