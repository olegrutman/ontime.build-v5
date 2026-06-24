// SOV Templates based on project type
// Each item can have a floorBased flag to generate per-floor items

export type SovCategory = 'structural' | 'exterior' | 'correction' | 'milestone';

export interface SovTemplateItem {
  name: string;
  percentage: number;
  category: SovCategory;
  floorBased?: boolean;
  floorLabel?: string; // e.g., "Walls" becomes "1st Floor Walls"
  minFloors?: number; // Only include if floor_count >= this value
}

export interface SovTemplate {
  items: SovTemplateItem[];
}

// Helper to format floor numbers with ordinal suffix
export function formatFloorOrdinal(floor: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = floor % 100;
  return floor + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]) + ' Floor';
}

// Single Family template - base items (additional items added dynamically based on project config)
export const SINGLE_FAMILY_TEMPLATE: SovTemplate = {
  items: [
    { name: 'Mobilization', percentage: 3, category: 'milestone' },
    { name: 'First Floor Subfloor', percentage: 5, category: 'structural' },
    { name: 'Main Level Walls', percentage: 10, category: 'structural' },
    { name: 'Main Level Wall Sheathing', percentage: 5, category: 'structural' },
    { name: 'Second Floor Subfloor', percentage: 5, category: 'structural', minFloors: 2 },
    { name: 'Second Floor Walls', percentage: 8, category: 'structural', minFloors: 2 },
    { name: 'Second Floor Wall Sheathing', percentage: 5, category: 'structural', minFloors: 2 },
    { name: 'Third Floor Subfloor', percentage: 4, category: 'structural', minFloors: 3 },
    { name: 'Third Floor Walls', percentage: 6, category: 'structural', minFloors: 3 },
    { name: 'Third Floor Wall Sheathing', percentage: 4, category: 'structural', minFloors: 3 },
    { name: 'Roof Trusses', percentage: 10, category: 'structural' },
    { name: 'Roof Sheathing', percentage: 8, category: 'structural' },
    { name: 'Main Level Backout', percentage: 5, category: 'correction' },
    { name: 'Second Floor Backout', percentage: 5, category: 'correction', minFloors: 2 },
    { name: 'Third Floor Backout', percentage: 4, category: 'correction', minFloors: 3 },
    { name: 'Fascia & Soffit', percentage: 5, category: 'exterior' },
    { name: 'Window Installation', percentage: 6, category: 'exterior' },
    { name: 'Door Installation', percentage: 4, category: 'exterior' },
    { name: 'Siding', percentage: 10, category: 'exterior' },
    { name: 'Final Punch', percentage: 6, category: 'milestone' },
  ],
};

// Single-family add-on items based on project configuration
// Basement items - logic:
// - Walkout + Finished: Basement Outside Walls + Basement Wall Framing
// - Walkout + Unfinished: Basement Outside Walls only
// - Regular + Finished: Basement Wall Framing only
// - Regular + Unfinished: nothing extra
export const SF_BASEMENT_OUTSIDE_WALLS: SovTemplateItem = 
  { name: 'Basement Outside Walls', percentage: 3, category: 'structural' };

export const SF_BASEMENT_WALL_FRAMING: SovTemplateItem = 
  { name: 'Basement Wall Framing', percentage: 3, category: 'structural' };

// Crawl space items
export const SF_CRAWL_SPACE_ITEMS: SovTemplateItem[] = [
  { name: 'Crawl Space Framing', percentage: 2, category: 'structural' },
];

// Outdoor features
export const SF_DECK_ITEM: SovTemplateItem = 
  { name: 'Deck Framing', percentage: 3, category: 'exterior' };

export const SF_PORCH_ITEM: SovTemplateItem = 
  { name: 'Porch Framing', percentage: 2.5, category: 'exterior' };

export const SF_PATIO_ITEM: SovTemplateItem = 
  { name: 'Patio Cover Framing', percentage: 2, category: 'exterior' };

export const SF_GARAGE_ITEM: SovTemplateItem = 
  { name: 'Garage', percentage: 4, category: 'structural' };

// Townhome template - floor-based walls and backout
export const TOWNHOME_TEMPLATE: SovTemplate = {
  items: [
    // Per-floor items
    { name: 'Walls', percentage: 8, category: 'structural', floorBased: true, floorLabel: 'Walls' },
    { name: 'Backout', percentage: 4, category: 'correction', floorBased: true, floorLabel: 'Backout' },
    // Once items
    { name: 'Shim & Shave', percentage: 3, category: 'correction' },
    { name: 'Roof Trusses', percentage: 8, category: 'structural' },
    { name: 'Roof Sheathing', percentage: 6, category: 'structural' },
    { name: 'Parapet Walls / Roof Access', percentage: 4, category: 'structural' },
    { name: 'Hardware Installation', percentage: 3, category: 'structural' },
    { name: 'Rough Inspection Completed', percentage: 2, category: 'milestone' },
    { name: 'Fascia & Soffit', percentage: 4, category: 'exterior' },
    { name: 'Tyvek', percentage: 3, category: 'exterior' },
    { name: 'Siding – Front', percentage: 6, category: 'exterior' },
    { name: 'Siding – Back', percentage: 6, category: 'exterior' },
    { name: 'Siding – Side #1', percentage: 4, category: 'exterior' },
    { name: 'Siding – Side #2', percentage: 4, category: 'exterior' },
    { name: 'Decks', percentage: 5, category: 'exterior' },
    { name: 'Final Punch', percentage: 6, category: 'milestone' },
  ],
};

// Apartment template (also used for Hotel and Mixed-Use)
export const APARTMENT_TEMPLATE: SovTemplate = {
  items: [
    // Per-floor items
    { name: 'Trusses', percentage: 6, category: 'structural', floorBased: true, floorLabel: 'Trusses' },
    { name: 'Truss Sheathing', percentage: 4, category: 'structural', floorBased: true, floorLabel: 'Truss Sheathing' },
    { name: 'Walls Framing', percentage: 6, category: 'structural', floorBased: true, floorLabel: 'Walls Framing' },
    { name: 'Wall Sheathing', percentage: 4, category: 'structural', floorBased: true, floorLabel: 'Wall Sheathing' },
    { name: 'Hardware Installation', percentage: 2, category: 'structural', floorBased: true, floorLabel: 'Hardware Installation' },
    { name: 'Backout / Blocking', percentage: 3, category: 'correction', floorBased: true, floorLabel: 'Backout / Blocking' },
    { name: 'Decks', percentage: 2, category: 'exterior', floorBased: true, floorLabel: 'Decks' },
    { name: 'Shim & Shave', percentage: 2, category: 'correction', floorBased: true, floorLabel: 'Shim & Shave' },
    // Roof items (once)
    { name: 'Roof Trusses', percentage: 6, category: 'structural' },
    { name: 'Roof Truss Sheathing', percentage: 4, category: 'structural' },
    { name: 'Roof Truss Hardware Installation', percentage: 2, category: 'structural' },
    // Exterior items (once)
    { name: 'Windows Installation', percentage: 8, category: 'exterior' },
    { name: 'Tyvek Installation', percentage: 4, category: 'exterior' },
    { name: 'Siding', percentage: 10, category: 'exterior' },
  ],
};

// Podium construction items
export const PODIUM_ITEMS: SovTemplateItem[] = [
  { name: 'Podium Slab Interface', percentage: 2, category: 'structural' },
  { name: 'Podium Shear Walls', percentage: 3, category: 'structural' },
  { name: 'Podium Blocking & Fire Stopping', percentage: 2, category: 'structural' },
];

// Partial floor/setback items
export const PARTIAL_FLOOR_ITEMS: SovTemplateItem[] = [
  { name: 'Partial Floor Framing Adjustments', percentage: 1.5, category: 'structural' },
  { name: 'Stepback / Setback Framing', percentage: 1.5, category: 'structural' },
];

// Mixed-use commercial floor items
export const MIXED_USE_COMMERCIAL_ITEMS: SovTemplateItem[] = [
  { name: 'Commercial Framing Scope', percentage: 2, category: 'structural' },
  { name: 'Structural Blocking (Commercial)', percentage: 1, category: 'structural' },
  { name: 'Fire Blocking (Commercial)', percentage: 1, category: 'structural' },
];

export type ProjectTypeForSOV = 'single_family' | 'townhomes' | 'apartments' | 'hotel' | 'mixed_use';

export function getTemplateForProjectType(projectType: ProjectTypeForSOV): SovTemplate {
  switch (projectType) {
    case 'single_family':
      return SINGLE_FAMILY_TEMPLATE;
    case 'townhomes':
      return TOWNHOME_TEMPLATE;
    case 'apartments':
    case 'hotel':
    case 'mixed_use':
      // Hotel and Mixed-Use always use Apartment template
      return APARTMENT_TEMPLATE;
    default:
      return SINGLE_FAMILY_TEMPLATE;
  }
}

export interface GeneratedSovItem {
  name: string;
  percentage: number;
  floor: number | null;
  floorLabel: string | null;
  category: SovCategory;
  source: 'auto' | 'custom';
  status: 'not_started' | 'in_progress' | 'complete';
  is_active: boolean;
  sort_order: number;
  is_from_change_order?: boolean;
  change_order_id?: string | null;
}

export interface SovGenerationOptions {
  projectType: ProjectTypeForSOV;
  numFloors: number;
  contractValue?: number;
  hasPodium?: boolean;
  partialFloors?: boolean;
  // Single-family specific options
  foundationType?: 'basement' | 'crawl_space' | 'slab';
  basementType?: 'walkout' | 'garden' | 'regular';
  basementFinish?: 'finished' | 'partial' | 'unfinished';
  numDecks?: number;
  numPatios?: number;
  numGarages?: number;
  garageCarCount?: number;
}

export function generateSovItems(
  projectType: ProjectTypeForSOV,
  numFloors: number,
  contractValue: number = 0,
  hasPodium: boolean = false,
  partialFloors: boolean = false,
  sfOptions?: {
    foundationType?: 'basement' | 'crawl_space' | 'slab';
    basementType?: 'walkout' | 'garden' | 'regular';
    basementFinish?: 'finished' | 'partial' | 'unfinished';
    numDecks?: number;
    numPatios?: number;
    numGarages?: number;
    garageCarCount?: number;
  }
): GeneratedSovItem[] {
  const template = getTemplateForProjectType(projectType);
  const items: GeneratedSovItem[] = [];
  let sortOrder = 0;

  // Add podium items first if applicable
  if (hasPodium && (projectType === 'apartments' || projectType === 'hotel' || projectType === 'mixed_use')) {
    PODIUM_ITEMS.forEach(podiumItem => {
      items.push({
        name: podiumItem.name,
        percentage: podiumItem.percentage,
        floor: null,
        floorLabel: null,
        category: podiumItem.category,
        source: 'auto',
        status: 'not_started',
        is_active: true,
        sort_order: sortOrder++,
      });
    });
  }

  // Add single-family basement items based on configuration
  // Logic:
  // - Walkout + Finished: Basement Outside Walls + Basement Wall Framing
  // - Walkout + Unfinished: Basement Outside Walls only
  // - Regular + Finished: Basement Wall Framing only
  // - Regular + Unfinished: nothing extra
  if (projectType === 'single_family' && sfOptions?.foundationType === 'basement') {
    const isWalkout = sfOptions?.basementType === 'walkout';
    const isFinished = sfOptions?.basementFinish === 'finished' || sfOptions?.basementFinish === 'partial';

    // Add Basement Outside Walls for walkout basements
    if (isWalkout) {
      items.push({
        name: SF_BASEMENT_OUTSIDE_WALLS.name,
        percentage: SF_BASEMENT_OUTSIDE_WALLS.percentage,
        floor: null,
        floorLabel: 'Basement',
        category: SF_BASEMENT_OUTSIDE_WALLS.category,
        source: 'auto',
        status: 'not_started',
        is_active: true,
        sort_order: sortOrder++,
      });
    }

    // Add Basement Wall Framing for finished basements (walkout or regular)
    if (isFinished) {
      const adjustedPercentage = sfOptions?.basementFinish === 'partial' 
        ? SF_BASEMENT_WALL_FRAMING.percentage * 0.5 
        : SF_BASEMENT_WALL_FRAMING.percentage;
      items.push({
        name: sfOptions?.basementFinish === 'partial' ? 'Partial Basement Wall Framing' : SF_BASEMENT_WALL_FRAMING.name,
        percentage: adjustedPercentage,
        floor: null,
        floorLabel: 'Basement',
        category: SF_BASEMENT_WALL_FRAMING.category,
        source: 'auto',
        status: 'not_started',
        is_active: true,
        sort_order: sortOrder++,
      });
    }
  }

  // Add crawl space items
  if (projectType === 'single_family' && sfOptions?.foundationType === 'crawl_space') {
    SF_CRAWL_SPACE_ITEMS.forEach(item => {
      items.push({
        name: item.name,
        percentage: item.percentage,
        floor: null,
        floorLabel: null,
        category: item.category,
        source: 'auto',
        status: 'not_started',
        is_active: true,
        sort_order: sortOrder++,
      });
    });
  }

  // Calculate floor-based items
  const floorBasedItems = template.items.filter(item => item.floorBased);
  const nonFloorBasedItems = template.items.filter(item => !item.floorBased);

  // Generate floor-based items
  for (let floor = 1; floor <= numFloors; floor++) {
    const floorLabel = formatFloorOrdinal(floor);
    
    floorBasedItems.forEach(templateItem => {
      items.push({
        name: `${floorLabel} ${templateItem.floorLabel || templateItem.name}`,
        percentage: Math.round((templateItem.percentage / numFloors) * 100) / 100,
        floor,
        floorLabel,
        category: templateItem.category,
        source: 'auto',
        status: 'not_started',
        is_active: true,
        sort_order: sortOrder++,
      });
    });

    // Add partial floor items for affected floors if enabled
    if (partialFloors && floor > 1) {
      PARTIAL_FLOOR_ITEMS.forEach(partialItem => {
        items.push({
          name: `${floorLabel} ${partialItem.name}`,
          percentage: Math.round((partialItem.percentage / (numFloors - 1)) * 100) / 100,
          floor,
          floorLabel,
          category: partialItem.category,
          source: 'auto',
          status: 'not_started',
          is_active: true,
          sort_order: sortOrder++,
        });
      });
    }
  }

  // Add non floor-based items (filtered by minFloors)
  nonFloorBasedItems
    .filter(item => !item.minFloors || numFloors >= item.minFloors)
    .forEach(templateItem => {
      items.push({
        name: templateItem.name,
        percentage: templateItem.percentage,
        floor: null,
        floorLabel: null,
        category: templateItem.category,
        source: 'auto',
        status: 'not_started',
        is_active: true,
        sort_order: sortOrder++,
      });
    });

  // Add single-family outdoor features
  if (projectType === 'single_family') {
    // Add deck items
    const numDecks = sfOptions?.numDecks || 0;
    for (let i = 0; i < numDecks; i++) {
      items.push({
        name: numDecks === 1 ? 'Deck Framing' : `Deck ${i + 1} Framing`,
        percentage: SF_DECK_ITEM.percentage,
        floor: null,
        floorLabel: null,
        category: SF_DECK_ITEM.category,
        source: 'auto',
        status: 'not_started',
        is_active: true,
        sort_order: sortOrder++,
      });
    }

    // Add porch items (using numDecks for porches too, or we can add a separate field)
    // For now, porches are included with decks - each deck can be a porch
    // If user wants separate porch tracking, we'd need a numPorches field

    // Add patio items
    const numPatios = sfOptions?.numPatios || 0;
    for (let i = 0; i < numPatios; i++) {
      items.push({
        name: numPatios === 1 ? 'Patio Cover Framing' : `Patio Cover ${i + 1} Framing`,
        percentage: SF_PATIO_ITEM.percentage,
        floor: null,
        floorLabel: null,
        category: SF_PATIO_ITEM.category,
        source: 'auto',
        status: 'not_started',
        is_active: true,
        sort_order: sortOrder++,
      });
    }

    // Add garage items
    const numGarages = sfOptions?.numGarages || 0;
    const garageCarCount = sfOptions?.garageCarCount || 0;
    if (numGarages > 0) {
      const garageName = numGarages === 1 
        ? `${garageCarCount > 0 ? garageCarCount + '-Car ' : ''}Garage Framing`
        : `Garage Framing (${numGarages} garages${garageCarCount > 0 ? `, ${garageCarCount}-car total` : ''})`;
      items.push({
        name: garageName,
        percentage: SF_GARAGE_ITEM.percentage * Math.min(numGarages, 2), // Cap at 2x for multiple garages
        floor: null,
        floorLabel: null,
        category: SF_GARAGE_ITEM.category,
        source: 'auto',
        status: 'not_started',
        is_active: true,
        sort_order: sortOrder++,
      });
    }
  }

  // Normalize percentages to sum to exactly 100%
  const totalPercentage = items.reduce((sum, item) => sum + item.percentage, 0);
  if (totalPercentage > 0 && Math.abs(totalPercentage - 100) > 0.001) {
    const adjustment = 100 / totalPercentage;
    items.forEach(item => {
      item.percentage = Math.round(item.percentage * adjustment * 100) / 100;
    });
    
    // Fix any rounding errors by adjusting the last item
    const newTotal = items.reduce((sum, item) => sum + item.percentage, 0);
    const diff = 100 - newTotal;
    if (Math.abs(diff) > 0.001 && items.length > 0) {
      items[items.length - 1].percentage = Math.round((items[items.length - 1].percentage + diff) * 100) / 100;
    }
  }

  return items;
}

// Merge regenerated SOV with existing custom items
export function mergeWithCustomItems(
  newAutoItems: GeneratedSovItem[],
  existingItems: GeneratedSovItem[]
): GeneratedSovItem[] {
  // Separate custom items from existing
  const customItems = existingItems.filter(item => item.source === 'custom');
  
  // Start with new auto-generated items
  const merged = [...newAutoItems];
  
  // Append custom items at the end, preserving their order relative to each other
  customItems.forEach((customItem, index) => {
    merged.push({
      ...customItem,
      sort_order: newAutoItems.length + index,
    });
  });

  return merged;
}

// Get display label for category
export function getCategoryLabel(category: SovCategory): string {
  switch (category) {
    case 'structural':
      return 'Structural';
    case 'exterior':
      return 'Exterior';
    case 'correction':
      return 'Correction';
    case 'milestone':
      return 'Milestone';
    default:
      return category;
  }
}

// Get category color class
export function getCategoryColor(category: SovCategory): string {
  switch (category) {
    case 'structural':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'exterior':
      return 'bg-green-500/10 text-green-600 border-green-500/20';
    case 'correction':
      return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'milestone':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
