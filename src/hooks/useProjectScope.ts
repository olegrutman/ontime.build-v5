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
}

export interface ExteriorOption {
  category: string;
  direction: string | null;
  value: string;
  label: string;
}

export function getLevelOptions(scope: ProjectScopeDetails | null): string[] {
  const levels: string[] = [];

  if (!scope) {
    // Default levels if no scope
    return ['Floor 1', 'Floor 2', 'Floor 3', 'Basement', 'Attic', 'Mezzanine', 'Other'];
  }

  // Add basement if foundation type is basement
  if (scope.foundation_type?.toLowerCase() === 'basement') {
    const basementLabel = scope.basement_type 
      ? `Basement (${scope.basement_type})` 
      : 'Basement';
    levels.push(basementLabel);
  }

  // Add floors based on project floors count
  const floorCount = scope.floors || scope.stories || 1;
  for (let i = 1; i <= floorCount; i++) {
    levels.push(`Floor ${i}`);
  }

  // Add attic if roof type suggests it (not flat)
  if (scope.roof_type && scope.roof_type.toLowerCase() !== 'flat') {
    levels.push('Attic');
  }

  // Add mezzanine option
  levels.push('Mezzanine');
  levels.push('Other');

  return levels;
}

export function getExteriorOptions(scope: ProjectScopeDetails | null): ExteriorOption[] {
  const options: ExteriorOption[] = [];
  const cardinalDirections = ['North', 'South', 'East', 'West'];
  const relativeDirections = ['Left', 'Right', 'Front', 'Back'];

  // Balconies
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

  // Siding
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

  // Roof - always available for exterior
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

  // Fascia & Soffit
  if (scope?.fascia_included) {
    options.push({
      category: 'Fascia',
      direction: null,
      value: 'fascia',
      label: 'Fascia',
    });
  }

  if (scope?.soffit_included) {
    options.push({
      category: 'Soffit',
      direction: null,
      value: 'soffit',
      label: 'Soffit',
    });
  }

  // Decorative items
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

  // Covered porches
  if (scope?.has_covered_porches) {
    options.push({
      category: 'Covered Porch',
      direction: null,
      value: 'covered_porch',
      label: 'Covered Porch',
    });
  }

  // Decking
  if (scope?.decking_included) {
    options.push({
      category: 'Deck',
      direction: null,
      value: 'deck',
      label: 'Deck',
    });
  }

  // Default exterior options if nothing in scope
  if (options.length === 1) {
    // Only roof general was added, add common defaults
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

  // Other option always at the end
  options.push({
    category: 'Other',
    direction: null,
    value: 'other',
    label: 'Other',
  });

  return options;
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
