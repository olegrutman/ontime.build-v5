export interface ProjectType {
  id: string;
  name: string;
  slug: string;
  is_multifamily: boolean;
  is_single_family: boolean;
  is_commercial: boolean;
  default_stories: number;
  default_units_per_building: number | null;
  default_number_of_buildings: number;
}

export interface ProjectProfile {
  id: string;
  project_id: string;
  project_type_id: string;
  stories: number;
  units_per_building: number | null;
  number_of_buildings: number;
  foundation_types: string[];
  roof_type: string | null;
  has_garage: boolean;
  garage_types: string[];
  has_basement: boolean;
  basement_type: string | null;
  has_stairs: boolean;
  stair_types: string[];
  has_deck_balcony: boolean;
  has_pool: boolean;
  has_elevator: boolean;
  has_clubhouse: boolean;
  has_commercial_spaces: boolean;
  has_shed: boolean;
  is_complete: boolean;
  created_at: string;
  updated_at: string;
  // New building definition fields
  framing_system: string | null;
  floor_system: string | null;
  roof_system: string | null;
  structure_type: string | null;
  has_corridors: boolean;
  corridor_type: string | null;
  has_balcony: boolean;
  has_deck: boolean;
  has_covered_porch: boolean;
  deck_porch_type: string | null;
  entry_type: string | null;
  special_rooms: string[];
  stories_per_unit: number | null;
  garage_car_count: number | null;
  // Scope fields
  scope_windows_install: boolean;
  scope_windows_type: string | null;
  scope_patio_doors: boolean;
  scope_patio_door_type: string | null;
  scope_siding: boolean;
  scope_siding_type: string | null;
  scope_siding_level: string | null;
  scope_exterior_trim: boolean;
  scope_exterior_trim_type: string | null;
  scope_soffit_fascia: boolean;
  scope_fascia_type: string | null;
  scope_soffit_type: string | null;
  scope_backout: boolean;
  scope_backout_blocking: boolean;
  scope_backout_blocking_items: string[];
  scope_backout_shimming: boolean;
  scope_backout_stud_repair: boolean;
  scope_backout_nailer_plates: boolean;
  scope_backout_pickup_framing: boolean;
  scope_decks_railings: boolean;
  scope_deck_type: string | null;
  scope_railings: boolean;
  scope_garage_framing: boolean;
  scope_garage_trim_openings: boolean;
  scope_wrb: boolean;
  scope_wrb_type: string | null;
  scope_sheathing: boolean;
  scope_extras: string[];
  scope_fire_stopping: boolean;
  scope_stairs_scope: boolean;
  scope_curtain_wall: boolean;
  scope_storefront_framing: boolean;
}

export interface ScopeSection {
  id: string;
  slug: string;
  label: string;
  display_order: number;
  always_visible: boolean;
  required_feature: string | null;
  description: string | null;
}

export interface ScopeItem {
  id: string;
  section_id: string;
  label: string;
  item_type: 'STD' | 'OPT';
  default_on: boolean;
  required_feature: string | null;
  excluded_project_types: string[];
  only_project_types: string[] | null;
  display_order: number;
  min_stories: number | null;
}

export interface ScopeSelection {
  id: string;
  project_id: string;
  profile_id: string;
  scope_item_id: string;
  is_on: boolean;
  is_new: boolean;
  is_conflict: boolean;
}

export type ProfileDraft = Omit<ProjectProfile, 'id' | 'created_at' | 'updated_at'>;

// ── Option Constants ──────────────────────────────────────────

export const FOUNDATION_OPTIONS = [
  'Slab',
  'Crawl Space',
  'Basement',
] as const;

export const BASEMENT_SUBTYPE_OPTIONS = [
  'Walkout',
  'Standard',
] as const;

export const BASEMENT_FINISH_OPTIONS = [
  'Finished',
  'Unfinished',
] as const;

export const FRAMING_SYSTEM_OPTIONS = [
  'Stick Frame',
  'Pre-Fabricated Walls (Panelized)',
] as const;

export const FLOOR_SYSTEM_OPTIONS = [
  'TJI (Engineered Joists)',
  'Floor Trusses',
] as const;

export const ROOF_SYSTEM_OPTIONS = [
  'Stick Frame Roof',
  'Pre-Manufactured Trusses',
  'Flat Roof System',
] as const;

export const STRUCTURE_TYPE_OPTIONS = [
  'Wood Frame',
  'Steel',
  'Mixed',
] as const;

export const GARAGE_OPTIONS = [
  'None',
  'Attached',
  'Detached',
] as const;

export const DECK_PORCH_OPTIONS = [
  'None',
  'Deck',
  'Covered Porch',
  'Both',
] as const;

export const ENTRY_TYPE_OPTIONS = [
  'Standard',
  'Open Entry',
  'Covered Entry',
] as const;

export const SPECIAL_ROOM_OPTIONS = [
  'Mechanical Room',
  'Boiler Room',
  'Elevator Shaft',
] as const;

export const CORRIDOR_OPTIONS = [
  'Interior',
  'Exterior',
  'None',
] as const;

export const GARAGE_CAR_COUNT_OPTIONS = [
  '1', '2', '3', '4',
] as const;

export const ROOF_PITCH_OPTIONS = [
  'Flat',
  'Pitched',
] as const;

// ── Scope Option Constants ────────────────────────────────────

export const WINDOW_TYPE_OPTIONS = [
  'Vinyl', 'Wood', 'Aluminum', 'Mixed',
] as const;

export const PATIO_DOOR_TYPE_OPTIONS = [
  'Sliding', 'French', 'Standard Exterior',
] as const;

export const SIDING_TYPE_OPTIONS = [
  'Vinyl', 'Hardie', 'Wood', 'Metal', 'Mixed',
] as const;

export const SIDING_LEVEL_OPTIONS = [
  'Full', 'Partial',
] as const;

export const EXTERIOR_TRIM_TYPE_OPTIONS = [
  'Wood', 'PVC', 'Composite',
] as const;

export const SOFFIT_TYPE_OPTIONS = [
  'Vinyl', 'Aluminum', 'Wood', 'Hardie',
] as const;

export const FASCIA_TYPE_OPTIONS = [
  'Wood', 'PVC', 'Aluminum',
] as const;

export const WRB_TYPE_OPTIONS = [
  'Tyvek', 'Zip System', 'Felt Paper', 'Other',
] as const;

export const SCOPE_DECK_TYPE_OPTIONS = [
  'Wood', 'Composite', 'Trex',
] as const;

export const BACKOUT_BLOCKING_OPTIONS = [
  'TV Mounts', 'Cabinet Blocking', 'Handrail Blocking', 'Grab Bar Blocking',
  'Shelf Blocking', 'Medicine Cabinet', 'Tub/Shower Blocking', 'Specialty Blocking',
] as const;

export const SCOPE_EXTRAS_OPTIONS = [
  'Columns', 'Corbels', 'Custom Headers', 'Rake Boards', 'Frieze Boards',
] as const;

export const SCOPE_EXTRAS_COMMERCIAL = [
  'Curtain Wall Framing', 'Storefront Framing',
] as const;

// Legacy options kept for backward compat with scope wizard
export const ROOF_OPTIONS = [
  'Truss — gable',
  'Truss — hip',
  'Truss — flat',
  'Conventionally framed',
  'Flat / TPO',
  'Mansard',
] as const;

export const GARAGE_TYPE_OPTIONS = [
  'Attached private',
  'Detached private',
  'Tuck-under',
  'Detached common structure',
  'Carport',
] as const;

export const BASEMENT_TYPE_OPTIONS = [
  'Full finished',
  'Full unfinished',
  'Partial',
  'Walk-out',
  'Daylight',
] as const;

export const STAIR_TYPE_OPTIONS = [
  'Interior wood',
  'Interior steel',
  'Exterior egress concrete',
  'Exterior egress wood',
  'Common corridor',
  'Balcony / deck stairs',
] as const;

export const WIZARD_STEPS = [
  'Project Type',
  'Building Structure',
  'Scope',
  'Review',
] as const;

/** Maps project_type slug → smart defaults for ProfileDraft fields */
export function getSmartDefaults(slug: string): Partial<ProfileDraft> {
  const base = {
    has_pool: false, has_clubhouse: false, has_commercial_spaces: false, has_shed: false,
    has_deck_balcony: false,
    garage_types: [] as string[], stair_types: [] as string[],
    special_rooms: [] as string[],
    // Scope defaults
    scope_windows_install: true, scope_windows_type: 'Vinyl' as string | null,
    scope_patio_doors: true, scope_patio_door_type: null as string | null,
    scope_siding: true, scope_siding_type: 'Hardie' as string | null, scope_siding_level: 'Full' as string | null,
    scope_exterior_trim: true, scope_exterior_trim_type: 'PVC' as string | null,
    scope_soffit_fascia: true, scope_fascia_type: 'PVC' as string | null, scope_soffit_type: 'Vinyl' as string | null,
    scope_backout: true,
    scope_backout_blocking: true, scope_backout_blocking_items: ['TV Mounts', 'Cabinet Blocking', 'Handrail Blocking'] as string[],
    scope_backout_shimming: true, scope_backout_stud_repair: true,
    scope_backout_nailer_plates: true, scope_backout_pickup_framing: true,
    scope_decks_railings: false, scope_deck_type: null as string | null, scope_railings: false,
    scope_garage_framing: false, scope_garage_trim_openings: false,
    scope_wrb: true, scope_wrb_type: 'Tyvek' as string | null,
    scope_sheathing: true,
    scope_extras: [] as string[],
    scope_fire_stopping: false,
    scope_stairs_scope: false,
    scope_curtain_wall: false, scope_storefront_framing: false,
  };

  switch (slug) {
    case 'custom_home':
    case 'production_home':
      return {
        ...base,
        stories: 2, units_per_building: null, number_of_buildings: 1,
        foundation_types: ['Slab'], roof_type: null,
        framing_system: 'Stick Frame', floor_system: 'TJI (Engineered Joists)',
        roof_system: 'Pre-Manufactured Trusses', structure_type: null,
        has_garage: true, has_basement: false, basement_type: null,
        has_stairs: true, has_elevator: false,
        has_corridors: false, corridor_type: null,
        has_balcony: false, has_deck: false, has_covered_porch: false,
        deck_porch_type: 'None', entry_type: 'Standard',
        stories_per_unit: null, garage_car_count: 2,
      };
    case 'townhome':
      return {
        ...base,
        stories: 3, units_per_building: 8, number_of_buildings: 1,
        foundation_types: ['Slab'], roof_type: null,
        framing_system: 'Stick Frame', floor_system: 'Floor Trusses',
        roof_system: 'Pre-Manufactured Trusses', structure_type: null,
        has_garage: true, has_basement: false, basement_type: null,
        has_stairs: true, has_elevator: false,
        has_corridors: false, corridor_type: null,
        has_balcony: true, has_deck: false, has_covered_porch: false,
        deck_porch_type: 'None', entry_type: 'Standard',
        stories_per_unit: 3, garage_car_count: 2,
      };
    case 'apartment':
      return {
        ...base,
        stories: 3, units_per_building: 36, number_of_buildings: 10,
        foundation_types: ['Slab'], roof_type: null,
        framing_system: 'Stick Frame', floor_system: 'Floor Trusses',
        roof_system: 'Pre-Manufactured Trusses', structure_type: null,
        has_garage: false, has_basement: false, basement_type: null,
        has_stairs: true, has_elevator: false,
        has_corridors: true, corridor_type: 'Interior',
        has_balcony: true, has_deck: false, has_covered_porch: false,
        deck_porch_type: 'None', entry_type: 'Standard',
        stories_per_unit: null,
        scope_interior_blocking: true, scope_fire_stopping: true, scope_stairs_scope: true,
      };
    case 'hotel':
      return {
        ...base,
        stories: 5, units_per_building: null, number_of_buildings: 1,
        foundation_types: ['Slab'], roof_type: null,
        framing_system: null, floor_system: 'Floor Trusses',
        roof_system: 'Flat Roof System', structure_type: 'Wood Frame',
        has_garage: false, has_basement: false, basement_type: null,
        has_stairs: true, has_elevator: true,
        has_corridors: true, corridor_type: 'Interior',
        has_balcony: false, has_deck: false, has_covered_porch: false,
        deck_porch_type: 'None', entry_type: 'Standard',
        stories_per_unit: null,
      };
    case 'commercial':
    case 'mixed_use':
      return {
        ...base,
        stories: slug === 'mixed_use' ? 4 : 2,
        units_per_building: slug === 'mixed_use' ? 20 : null,
        number_of_buildings: 1,
        foundation_types: ['Slab'], roof_type: null,
        framing_system: null, floor_system: 'Floor Trusses',
        roof_system: 'Flat Roof System', structure_type: 'Wood Frame',
        has_garage: false, has_basement: false, basement_type: null,
        has_stairs: true, has_elevator: false,
        has_corridors: false, corridor_type: null,
        has_balcony: false, has_deck: false, has_covered_porch: false,
        deck_porch_type: 'None', entry_type: 'Standard',
        stories_per_unit: null,
        has_commercial_spaces: slug === 'mixed_use',
      };
    default:
      return {};
  }
}

/** Check if an item-level required_feature matches the profile */
export function checkItemFeature(feature: string | null, profile: ProfileDraft): boolean {
  if (!feature) return true;

  const boolFeatures: Record<string, keyof ProfileDraft> = {
    has_garage: 'has_garage',
    has_basement: 'has_basement',
    has_stairs: 'has_stairs',
    has_deck_balcony: 'has_deck_balcony',
    has_pool: 'has_pool',
    has_elevator: 'has_elevator',
    has_clubhouse: 'has_clubhouse',
    has_commercial_spaces: 'has_commercial_spaces',
    has_shed: 'has_shed',
  };

  if (boolFeatures[feature]) {
    return !!profile[boolFeatures[feature]];
  }

  if (feature === 'garage_types_tuck_under') return profile.garage_types.includes('Tuck-under');
  if (feature === 'garage_types_carport') return profile.garage_types.includes('Carport');
  if (feature === 'basement_type_walk_out') return profile.basement_type === 'Walk-out';
  if (feature === 'basement_type_full_finished') return profile.basement_type === 'Full finished';
  if (feature === 'stair_types_interior_wood') return profile.stair_types.includes('Interior wood');
  if (feature === 'stair_types_interior_steel') return profile.stair_types.includes('Interior steel');
  if (feature === 'stair_types_exterior_egress_concrete') return profile.stair_types.includes('Exterior egress concrete');
  if (feature === 'stair_types_exterior_egress_wood') return profile.stair_types.includes('Exterior egress wood');
  if (feature === 'stair_types_common_corridor') return profile.stair_types.includes('Common corridor');
  if (feature === 'stair_types_balcony_deck') return profile.stair_types.includes('Balcony / deck stairs');

  return true;
}
