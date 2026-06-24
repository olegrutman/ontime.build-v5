import type { ProjectScopeDetails } from '@/hooks/useProjectScope';

export interface ComponentOption {
  label: string;
  icon: string;
}

export interface ComponentGroup {
  label: string;
  icon: string;
  options: ComponentOption[];
}

const MULTIFAMILY_TYPES = ['apartments_mf', 'townhomes', 'hotel_hospitality', 'senior_living'];
const COMMERCIAL_CONSTRUCTION = ['steel', 'concrete', 'masonry'];

function isMultifamily(scope: ProjectScopeDetails | null): boolean {
  return MULTIFAMILY_TYPES.includes(scope?.home_type ?? '');
}

function hasSharedWalls(scope: ProjectScopeDetails | null): boolean {
  if (!scope) return false;
  return scope.home_type === 'townhomes' || isMultifamily(scope);
}

function isCommercialConstruction(scope: ProjectScopeDetails | null): boolean {
  return COMMERCIAL_CONSTRUCTION.includes(scope?.construction_type ?? '');
}

function isSteelFraming(scope: ProjectScopeDetails | null): boolean {
  return scope?.framing_method === 'steel';
}

function isMetalStud(scope: ProjectScopeDetails | null): boolean {
  return scope?.framing_method === 'metal_stud' || isCommercialConstruction(scope);
}

/**
 * Returns the list of building component groups available based on:
 * - building type (single-family, townhome, multifamily, commercial)
 * - framing method (wood, steel, metal stud)
 * - construction type
 * - currently selected level (Basement / Attic narrow the list)
 * - interior vs exterior context
 */
export function getComponentGroups(
  scope: ProjectScopeDetails | null,
  level: string | null,
  isExterior: boolean,
): ComponentGroup[] {
  // Exterior context — totally different list
  if (isExterior) {
    return [
      {
        label: 'Wall (exterior)',
        icon: '🧱',
        options: [
          { label: 'Sheathing', icon: '▦' },
          { label: 'WRB / housewrap', icon: '🛡️' },
          { label: 'Siding back-up', icon: '═' },
          { label: 'Exterior wall framing', icon: '🪵' },
          { label: 'Veneer / cladding', icon: '🧱' },
        ],
      },
      {
        label: 'Roof system',
        icon: '🏠',
        options: [
          { label: 'Roof deck', icon: '▤' },
          { label: 'Roof sheathing', icon: '▦' },
          { label: isSteelFraming(scope) ? 'Steel rafters' : 'Rafters', icon: '🪵' },
          { label: 'Roof trusses', icon: '△' },
          { label: 'Ridge / valleys', icon: '▲' },
          { label: 'Eaves', icon: '◤' },
        ],
      },
      {
        label: 'Trim',
        icon: '═',
        options: [
          { label: 'Fascia', icon: '─' },
          { label: 'Soffit', icon: '▭' },
          { label: 'Frieze', icon: '═' },
        ],
      },
      {
        label: 'Openings',
        icon: '🪟',
        options: [
          { label: 'Window opening', icon: '🪟' },
          { label: 'Door opening', icon: '🚪' },
          { label: 'Header', icon: '═' },
        ],
      },
      { label: 'Other', icon: '•', options: [{ label: 'Other', icon: '•' }] },
    ];
  }

  // Interior context
  const lvl = (level ?? '').toLowerCase();
  const isAttic = lvl.includes('attic');
  const isBasement = lvl.includes('basement');

  // Attic — narrow list
  if (isAttic) {
    return [
      {
        label: 'Roof system',
        icon: '🏠',
        options: [
          { label: isSteelFraming(scope) ? 'Steel rafters' : 'Rafters', icon: '🪵' },
          { label: 'Roof trusses', icon: '△' },
          { label: 'Roof sheathing', icon: '▦' },
        ],
      },
      {
        label: 'Ceiling system',
        icon: '☐',
        options: [
          { label: 'Ceiling joists', icon: '═' },
          { label: 'Ceiling drywall', icon: '▭' },
          { label: 'Insulation cavity', icon: '▒' },
        ],
      },
      { label: 'Other', icon: '•', options: [{ label: 'Other', icon: '•' }] },
    ];
  }

  // Wall sub-options — adapt label by framing
  const wallOptions: ComponentOption[] = [];
  wallOptions.push({
    label: isMetalStud(scope) ? 'Metal stud partition' : 'Interior partition',
    icon: '▮',
  });
  if (hasSharedWalls(scope)) {
    wallOptions.push({ label: 'Demising wall (between units)', icon: '║' });
  }
  if (isMultifamily(scope)) {
    wallOptions.push({ label: 'Corridor wall', icon: '┃' });
    wallOptions.push({ label: 'Shaft wall', icon: '▌' });
    wallOptions.push({ label: 'Elevator shaft wall', icon: '▌' });
  }
  wallOptions.push({ label: 'Shear wall', icon: '▰' });
  wallOptions.push({ label: 'Exterior wall (interior face)', icon: '▱' });
  wallOptions.push({ label: 'Plumbing wall', icon: '🚿' });
  wallOptions.push({ label: 'Soffit / bulkhead', icon: '▭' });

  // Floor sub-options — adapt by framing & basement
  const floorOptions: ComponentOption[] = [];
  if (isBasement) {
    floorOptions.push({ label: 'Concrete slab', icon: '▦' });
    floorOptions.push({ label: 'Foundation wall', icon: '▮' });
    floorOptions.push({ label: 'Sill plate', icon: '─' });
  }
  if (isCommercialConstruction(scope)) {
    floorOptions.push({ label: 'Concrete slab', icon: '▦' });
    floorOptions.push({ label: 'Steel deck', icon: '▤' });
  }
  floorOptions.push({ label: 'Floor sheathing', icon: '▦' });
  floorOptions.push({
    label: isSteelFraming(scope) ? 'Steel joists / bar joists' : 'Floor joists / I-joists',
    icon: '═',
  });
  floorOptions.push({ label: 'Floor trusses', icon: '△' });
  floorOptions.push({ label: 'Subfloor', icon: '▭' });
  if (isMultifamily(scope) || hasSharedWalls(scope)) {
    floorOptions.push({ label: 'Floor/ceiling assembly (rated)', icon: '▦' });
  }
  floorOptions.push({ label: 'Floor underlayment', icon: '─' });

  // Ceiling sub-options
  const ceilingOptions: ComponentOption[] = [
    { label: 'Ceiling drywall', icon: '▭' },
    { label: 'Ceiling joists', icon: '═' },
    { label: 'Suspended / drop ceiling', icon: '▦' },
    { label: 'Bulkhead', icon: '▭' },
    { label: 'Coffer', icon: '◰' },
  ];

  // Roof — only on top floor or if no level set
  const roofOptions: ComponentOption[] = [
    { label: 'Roof sheathing', icon: '▦' },
    { label: isSteelFraming(scope) ? 'Steel rafters' : 'Rafters', icon: '🪵' },
    { label: 'Roof trusses', icon: '△' },
    { label: 'Ridge / valleys', icon: '▲' },
    { label: 'Eaves', icon: '◤' },
  ];

  const groups: ComponentGroup[] = [
    { label: 'Wall', icon: '🧱', options: wallOptions },
    { label: 'Floor system', icon: '▦', options: floorOptions },
    { label: 'Ceiling system', icon: '☐', options: ceilingOptions },
  ];

  // Roof typically only relevant on top floor — keep it available, users can ignore
  groups.push({ label: 'Roof system', icon: '🏠', options: roofOptions });

  // Stairs — multi-story only
  if ((scope?.stories ?? 1) > 1) {
    groups.push({
      label: 'Stairs',
      icon: '🪜',
      options: [
        { label: 'Stair stringers', icon: '╱' },
        { label: 'Stair treads', icon: '═' },
        { label: 'Landing', icon: '▭' },
        { label: 'Railing', icon: '┃' },
      ],
    });
  }

  groups.push({
    label: 'Opening',
    icon: '🪟',
    options: [
      { label: 'Window opening', icon: '🪟' },
      { label: 'Door opening', icon: '🚪' },
      { label: 'Header', icon: '═' },
    ],
  });

  groups.push({
    label: 'MEP chase',
    icon: '🔧',
    options: [
      { label: 'Mechanical chase', icon: '🌬️' },
      { label: 'Plumbing chase', icon: '🚿' },
      { label: 'Electrical chase', icon: '⚡' },
    ],
  });

  groups.push({ label: 'Other', icon: '•', options: [{ label: 'Other', icon: '•' }] });

  return groups;
}
