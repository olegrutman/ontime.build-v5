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

export const FOUNDATION_OPTIONS = [
  'Slab on grade',
  'Post-tension slab',
  'Crawl space',
  'Full basement',
  'Pier and beam',
  'Walk-out basement',
] as const;

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
  'Structure',
  'Building Details',
  'Features',
  'Review',
] as const;

/** Maps project_type slug → smart defaults for ProfileDraft fields */
export function getSmartDefaults(slug: string): Partial<ProfileDraft> {
  switch (slug) {
    case 'apartment':
      return {
        stories: 3, units_per_building: 36, number_of_buildings: 10,
        foundation_types: ['Post-tension slab'], roof_type: 'Truss — hip',
        has_garage: false, garage_types: [],
        has_basement: false, basement_type: null,
        has_stairs: true, stair_types: ['Common corridor', 'Exterior egress concrete'],
        has_deck_balcony: true, has_pool: false, has_elevator: false,
        has_clubhouse: false, has_commercial_spaces: false, has_shed: false,
      };
    case 'townhome':
      return {
        stories: 3, units_per_building: 8, number_of_buildings: 1,
        foundation_types: ['Slab on grade'], roof_type: 'Truss — gable',
        has_garage: true, garage_types: ['Attached private', 'Tuck-under'],
        has_basement: false, basement_type: null,
        has_stairs: true, stair_types: ['Interior wood'],
        has_deck_balcony: true, has_pool: false, has_elevator: false,
        has_clubhouse: false, has_commercial_spaces: false, has_shed: false,
      };
    case 'custom_home':
      return {
        stories: 2, units_per_building: null, number_of_buildings: 1,
        foundation_types: ['Slab on grade'], roof_type: 'Truss — gable',
        has_garage: true, garage_types: ['Attached private'],
        has_basement: false, basement_type: null,
        has_stairs: true, stair_types: ['Interior wood'],
        has_deck_balcony: false, has_pool: false, has_elevator: false,
        has_clubhouse: false, has_commercial_spaces: false, has_shed: false,
      };
    case 'production_home':
      return {
        stories: 2, units_per_building: null, number_of_buildings: 1,
        foundation_types: ['Slab on grade'], roof_type: 'Truss — gable',
        has_garage: true, garage_types: ['Attached private'],
        has_basement: false, basement_type: null,
        has_stairs: true, stair_types: ['Interior wood'],
        has_deck_balcony: false, has_pool: false, has_elevator: false,
        has_clubhouse: false, has_commercial_spaces: false, has_shed: false,
      };
    case 'commercial':
      return {
        stories: 2, units_per_building: null, number_of_buildings: 1,
        foundation_types: ['Slab on grade'], roof_type: 'Flat / TPO',
        has_garage: false, garage_types: [],
        has_basement: false, basement_type: null,
        has_stairs: true, stair_types: ['Interior steel', 'Exterior egress concrete'],
        has_deck_balcony: false, has_pool: false, has_elevator: false,
        has_clubhouse: false, has_commercial_spaces: false, has_shed: false,
      };
    case 'mixed_use':
      return {
        stories: 4, units_per_building: 20, number_of_buildings: 1,
        foundation_types: ['Post-tension slab'], roof_type: 'Flat / TPO',
        has_garage: false, garage_types: [],
        has_basement: false, basement_type: null,
        has_stairs: true, stair_types: ['Interior steel', 'Common corridor', 'Exterior egress concrete'],
        has_deck_balcony: false, has_pool: false, has_elevator: false,
        has_clubhouse: false, has_commercial_spaces: true, has_shed: false,
      };
    default:
      return {};
  }
}

/** Check if an item-level required_feature matches the profile */
export function checkItemFeature(feature: string | null, profile: ProfileDraft): boolean {
  if (!feature) return true;

  // Section-level boolean features
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

  // Garage sub-types
  if (feature === 'garage_types_tuck_under') return profile.garage_types.includes('Tuck-under');
  if (feature === 'garage_types_carport') return profile.garage_types.includes('Carport');

  // Basement sub-types
  if (feature === 'basement_type_walk_out') return profile.basement_type === 'Walk-out';
  if (feature === 'basement_type_full_finished') return profile.basement_type === 'Full finished';

  // Stair sub-types
  if (feature === 'stair_types_interior_wood') return profile.stair_types.includes('Interior wood');
  if (feature === 'stair_types_interior_steel') return profile.stair_types.includes('Interior steel');
  if (feature === 'stair_types_exterior_egress_concrete') return profile.stair_types.includes('Exterior egress concrete');
  if (feature === 'stair_types_exterior_egress_wood') return profile.stair_types.includes('Exterior egress wood');
  if (feature === 'stair_types_common_corridor') return profile.stair_types.includes('Common corridor');
  if (feature === 'stair_types_balcony_deck') return profile.stair_types.includes('Balcony / deck stairs');

  return true;
}
