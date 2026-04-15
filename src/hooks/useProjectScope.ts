import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProjectScopeDetails {
  id: string;
  project_id: string;
  home_type: string | null;
  floors: number | null;
  foundation_type: string | null;
  basement_type: string | null;
  basement_finish: string | null;
  stairs_type: string | null;
  has_elevator: boolean | null;
  shaft_type: string | null;
  garage_type: string | null;
  garage_cars: number | null;
  roof_type: string | null;
  has_roof_deck: boolean | null;
  roof_deck_type: string | null;
  has_covered_porches: boolean | null;
  has_balconies: boolean | null;
  balcony_type: string | null;
  decking_included: boolean | null;
  decking_type: string | null;
  siding_included: boolean | null;
  siding_materials: string[] | null;
  decorative_included: boolean | null;
  decorative_items: string[] | null;
  fascia_included: boolean | null;
  soffit_included: boolean | null;
  fascia_soffit_material: string | null;
  num_buildings: number | null;
  stories: number | null;
  construction_type: string | null;
  num_units: number | null;
  stories_per_unit: number | null;
  has_shared_walls: boolean | null;
  bedrooms: number | null;
  bathrooms: number | null;
  total_sqft: number | null;
  lot_size_acres: number | null;
  framing_method: string | null;
}

export interface ExteriorOption {
  category: string;
  direction: string | null;
  value: string;
  label: string;
}

export interface AreaOption {
  label: string;
  icon: string;
}

// ── Level options from scope ──────────────────────────────────
export function getLevelOptions(scope: ProjectScopeDetails | null): string[] {
  const levels: string[] = [];

  if (!scope) {
    return ['Floor 1', 'Floor 2', 'Floor 3', 'Basement', 'Attic', 'Mezzanine', 'Other'];
  }

  if (scope.foundation_type?.toLowerCase() === 'basement') {
    const basementLabel = scope.basement_type
      ? `Basement (${scope.basement_type})`
      : 'Basement';
    levels.push(basementLabel);
  }

  const floorCount = scope.floors || scope.stories || 1;
  for (let i = 1; i <= floorCount; i++) {
    levels.push(`Floor ${i}`);
  }

  if (scope.roof_type && scope.roof_type.toLowerCase() !== 'flat') {
    levels.push('Attic');
  }

  levels.push('Mezzanine');
  levels.push('Other');

  return levels;
}

// ── Smart area options based on level + scope ─────────────────
function expandBedrooms(scope: ProjectScopeDetails | null): AreaOption[] {
  const count = scope?.bedrooms ?? 0;
  const items: AreaOption[] = [];
  if (count > 1) {
    for (let i = 1; i <= count; i++) {
      items.push({ label: `Bedroom ${i}`, icon: '🛏️' });
    }
    // Always add Primary Suite for single-family
    const isSF = ['custom_home', 'track_home'].includes(scope?.home_type ?? '');
    if (isSF) {
      items.push({ label: 'Primary Suite', icon: '🛏️' });
    }
  } else {
    items.push({ label: 'Bedroom', icon: '🛏️' });
  }
  return items;
}

function expandBathrooms(scope: ProjectScopeDetails | null): AreaOption[] {
  const count = scope?.bathrooms ?? 0;
  const items: AreaOption[] = [];
  const fullCount = Math.floor(count);
  const hasHalf = count % 1 !== 0;

  if (fullCount > 1 || hasHalf) {
    for (let i = 1; i <= fullCount; i++) {
      items.push({ label: `Bathroom ${i}`, icon: '🚿' });
    }
    if (hasHalf) {
      items.push({ label: 'Half Bath', icon: '🚿' });
    }
  } else {
    items.push({ label: 'Bathroom', icon: '🚿' });
  }
  return items;
}

function garageOption(scope: ProjectScopeDetails | null): AreaOption | null {
  if (!scope?.garage_type || scope.garage_type.toLowerCase() === 'none') return null;
  const label = scope.garage_type !== 'garage'
    ? `Garage (${scope.garage_type})`
    : 'Garage';
  return { label, icon: '🚗' };
}

export function getAreaOptionsForLevel(
  scope: ProjectScopeDetails | null,
  level: string,
  isMultifamily: boolean,
): AreaOption[] {
  const normalizedLevel = level.toLowerCase();
  const isBasement = normalizedLevel.includes('basement');
  const isAttic = normalizedLevel === 'attic';
  const isMezzanine = normalizedLevel === 'mezzanine';
  const isGround = normalizedLevel === 'floor 1' || normalizedLevel === 'ground';
  const floorCount = scope?.floors || scope?.stories || 1;

  // Multifamily → show area types (unit, corridor, etc.)
  if (isMultifamily) {
    const opts: AreaOption[] = [
      { label: 'Unit interior', icon: '🏠' },
      { label: 'Corridor', icon: '🚶' },
    ];
    if (floorCount > 1) {
      opts.push({ label: 'Stairwell', icon: '🪜' });
    }
    if (scope?.has_elevator) {
      opts.push({ label: 'Elevator shaft', icon: '🛗' });
    }
    if (isBasement) {
      opts.push({ label: 'Mechanical', icon: '⚙️' });
      opts.push({ label: 'Storage', icon: '📦' });
    }
    opts.push({ label: 'Other', icon: '📍' });
    return opts;
  }

  // Single-family level-aware logic
  const options: AreaOption[] = [];

  if (isBasement) {
    options.push({ label: 'Utility Room', icon: '🔧' });
    options.push({ label: 'Storage', icon: '📦' });
    options.push({ label: 'Laundry', icon: '🧺' });
    options.push({ label: 'Mechanical', icon: '⚙️' });
    // Finished basement can have bedrooms/bathrooms
    if (scope?.basement_finish?.toLowerCase() === 'finished') {
      options.push(...expandBedrooms(scope));
      options.push(...expandBathrooms(scope));
      options.push({ label: 'Living Room', icon: '🛋️' });
    }
    // Garage sometimes in basement
    const g = garageOption(scope);
    if (g && scope?.garage_type?.toLowerCase().includes('basement')) {
      options.push(g);
    }
  } else if (isAttic) {
    options.push({ label: 'Storage', icon: '📦' });
    options.push({ label: 'Mechanical', icon: '⚙️' });
  } else if (isMezzanine) {
    options.push({ label: 'Open area', icon: '🏗️' });
    options.push({ label: 'Storage', icon: '📦' });
  } else {
    // Ground or upper floors
    options.push({ label: 'Kitchen', icon: '🍳' });
    options.push({ label: 'Living Room', icon: '🛋️' });

    if (isGround) {
      options.push({ label: 'Dining Room', icon: '🍽️' });
      options.push({ label: 'Mudroom', icon: '🥾' });
      options.push({ label: 'Pantry', icon: '🥫' });
    }

    options.push(...expandBedrooms(scope));
    options.push(...expandBathrooms(scope));
    options.push({ label: 'Closet', icon: '🚪' });
    options.push({ label: 'Laundry', icon: '🧺' });

    // Garage on ground only
    if (isGround) {
      const g = garageOption(scope);
      if (g) options.push(g);
    }
  }

  // Multi-story features
  if (floorCount > 1) {
    options.push({ label: 'Stairwell', icon: '🪜' });
  }
  if (scope?.has_elevator) {
    options.push({ label: 'Elevator shaft', icon: '🛗' });
  }

  options.push({ label: 'Other', icon: '📍' });
  return options;
}

// ── Unit room options (multifamily) ───────────────────────────
export function getUnitRoomOptions(scope: ProjectScopeDetails | null): AreaOption[] {
  const options: AreaOption[] = [
    { label: 'Kitchen', icon: '🍳' },
    { label: 'Living Room', icon: '🛋️' },
    ...expandBedrooms(scope),
    ...expandBathrooms(scope),
    { label: 'Laundry', icon: '🧺' },
    { label: 'Closet', icon: '🚪' },
    { label: 'Other', icon: '📍' },
  ];
  return options;
}

// ── Exterior options from scope ───────────────────────────────
export function getExteriorOptions(scope: ProjectScopeDetails | null): ExteriorOption[] {
  const options: ExteriorOption[] = [];
  const cardinalDirections = ['North', 'South', 'East', 'West'];
  const relativeDirections = ['Left', 'Right', 'Front', 'Back'];

  if (scope?.has_balconies) {
    [...cardinalDirections, ...relativeDirections].forEach(dir => {
      options.push({
        category: 'Balcony',
        direction: dir,
        value: `balcony_${dir.toLowerCase()}`,
        label: `Balcony - ${dir}`,
      });
    });
  }

  if (scope?.siding_included) {
    [...cardinalDirections, ...relativeDirections].forEach(dir => {
      options.push({
        category: 'Siding',
        direction: dir,
        value: `siding_${dir.toLowerCase()}`,
        label: `Siding - ${dir} Side`,
      });
    });
  }

  options.push({
    category: 'Roof',
    direction: 'General',
    value: 'roof_general',
    label: 'Roof - General',
  });

  if (scope?.has_roof_deck) {
    options.push({
      category: 'Roof Deck',
      direction: null,
      value: 'roof_deck',
      label: 'Roof Deck',
    });
  }

  if (scope?.fascia_included) {
    options.push({ category: 'Fascia', direction: null, value: 'fascia', label: 'Fascia' });
  }

  if (scope?.soffit_included) {
    options.push({ category: 'Soffit', direction: null, value: 'soffit', label: 'Soffit' });
  }

  if (scope?.decorative_included && scope.decorative_items) {
    scope.decorative_items.forEach(item => {
      options.push({
        category: 'Decorative',
        direction: item,
        value: `decorative_${item.toLowerCase().replace(/\s+/g, '_')}`,
        label: `Decorative - ${item}`,
      });
    });
  }

  if (scope?.has_covered_porches) {
    options.push({ category: 'Covered Porch', direction: null, value: 'covered_porch', label: 'Covered Porch' });
  }

  if (scope?.decking_included) {
    options.push({ category: 'Deck', direction: null, value: 'deck', label: 'Deck' });
  }

  // Default exterior if nothing scope-specific
  if (options.length === 1) {
    [...cardinalDirections, ...relativeDirections].forEach(dir => {
      options.push({
        category: 'Siding',
        direction: dir,
        value: `siding_${dir.toLowerCase()}`,
        label: `Siding - ${dir} Side`,
      });
    });
    options.push({ category: 'Fascia', direction: null, value: 'fascia', label: 'Fascia' });
    options.push({ category: 'Soffit', direction: null, value: 'soffit', label: 'Soffit' });
  }

  options.push({ category: 'Other', direction: null, value: 'other', label: 'Other' });
  return options;
}

// ── Scope-driven exterior elevation options ───────────────────
export function getElevationOptions(
  scope: ProjectScopeDetails | null,
  isMultifamily: boolean,
): AreaOption[] {
  const options: AreaOption[] = [];

  if (isMultifamily) {
    options.push({ label: 'South elevation', icon: '🧭' });
    options.push({ label: 'North elevation', icon: '🧭' });
    options.push({ label: 'East elevation', icon: '🧭' });
    options.push({ label: 'West elevation', icon: '🧭' });
  } else {
    options.push({ label: 'Front', icon: '🏠' });
    options.push({ label: 'Rear', icon: '🏡' });
    options.push({ label: 'Left side', icon: '◀️' });
    options.push({ label: 'Right side', icon: '▶️' });
  }

  options.push({ label: 'Roof', icon: '🏗️' });

  if (scope?.has_balconies) {
    options.push({ label: 'Balcony', icon: '🏠' });
  }
  if (scope?.has_covered_porches) {
    options.push({ label: 'Covered Porch', icon: '🏡' });
  }
  if (scope?.decking_included) {
    options.push({ label: 'Deck', icon: '🪵' });
  }
  if (scope?.fascia_included) {
    options.push({ label: 'Fascia', icon: '🔨' });
  }
  if (scope?.soffit_included) {
    options.push({ label: 'Soffit', icon: '🔨' });
  }

  options.push({ label: 'Other', icon: '📍' });
  return options;
}

// ── Build project context hint string ─────────────────────────
export function getProjectContextHint(scope: ProjectScopeDetails | null): string {
  if (!scope) return '';
  const parts: string[] = [];

  const floorCount = scope.floors || scope.stories || 1;
  parts.push(`${floorCount}-story`);

  const typeLabels: Record<string, string> = {
    custom_home: 'custom home',
    track_home: 'track home',
    apartments_mf: 'apartment building',
    townhomes: 'townhome',
    hotel_hospitality: 'hotel',
    senior_living: 'senior living',
  };
  if (scope.home_type) {
    parts.push(typeLabels[scope.home_type] || scope.home_type);
  }

  if (scope.foundation_type?.toLowerCase() === 'basement') {
    parts.push('with basement');
  }
  if (scope.num_units) {
    parts.push(`(${scope.num_units} units)`);
  }

  return parts.join(' ');
}

export function useProjectScope(projectId: string | undefined) {
  return useQuery({
    queryKey: ['project-scope-details', projectId],
    queryFn: async () => {
      if (!projectId) return null;

      const { data, error } = await supabase
        .from('project_scope_details')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching project scope:', error);
        return null;
      }

      return data as ProjectScopeDetails | null;
    },
    enabled: !!projectId,
  });
}
