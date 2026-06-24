/**
 * Generate SOV line items (titles only) based on project configuration.
 * Used during project creation to build initial SOV baseline.
 */

import { FramingScope } from '@/components/projects/FramingScopePicker';
import { ScopeLocation } from '@/components/projects/ScopeLocationPicker';

export interface SovLineItem {
  id: string;
  name: string;
  sort_order: number;
}

type StructureType = 'SINGLE_FAMILY' | 'TOWNHOME' | 'APARTMENT' | 'HOTEL';

interface GenerationInput {
  structureType: StructureType;
  floors: number;
  tcProvidesMaterials: boolean;
  framingScope: FramingScope;
  scopeLocation: ScopeLocation;
}

let itemCounter = 0;

function createItem(name: string): SovLineItem {
  return {
    id: `sov-${Date.now()}-${itemCounter++}`,
    name,
    sort_order: 0,
  };
}

export function generateSovItemsFromScope(input: GenerationInput): SovLineItem[] {
  const items: SovLineItem[] = [];
  const { structureType, floors, tcProvidesMaterials, framingScope, scopeLocation } = input;

  // Reset counter for this generation
  itemCounter = 0;

  // ============= CORE FRAMING =============

  // Structural Framing
  if (framingScope.structural_framing.enabled) {
    if (framingScope.structural_framing.steel_beams) {
      items.push(createItem('Structural Steel Beams & Supports'));
    }
    if (framingScope.structural_framing.wood_beams) {
      items.push(createItem('Structural Wood Beams'));
    }
    if (framingScope.structural_framing.other && framingScope.structural_framing.other_text) {
      items.push(createItem(`Structural Framing – ${framingScope.structural_framing.other_text}`));
    }
  }

  // Wall Framing
  if (framingScope.wall_framing.enabled) {
    if (framingScope.wall_framing.stick_framed) {
      items.push(createItem('Wall Framing – Stick Framed'));
    }
    if (framingScope.wall_framing.panelized) {
      items.push(createItem('Wall Framing – Panelized'));
    }
  }

  // Floor Framing
  if (framingScope.floor_framing.enabled) {
    if (framingScope.floor_framing.tji_joists) {
      items.push(createItem('Floor Framing – TJI/I-Joists'));
    }
    if (framingScope.floor_framing.floor_trusses) {
      items.push(createItem('Floor Framing – Floor Trusses'));
    }
    if (framingScope.floor_framing.dimensional_lumber) {
      items.push(createItem('Floor Framing – Dimensional Lumber'));
    }
  }

  // Roof Framing
  if (framingScope.roof_framing.enabled) {
    if (framingScope.roof_framing.roof_trusses) {
      items.push(createItem('Roof Framing – Roof Trusses'));
    }
    if (framingScope.roof_framing.structural_beams) {
      items.push(createItem('Roof Framing – Structural Roof Beams'));
    }
    if (framingScope.roof_framing.stick_framed) {
      items.push(createItem('Roof Framing – Stick Framed Roof'));
    }

    // Roof type specific
    if (framingScope.roof_framing.roof_type === 'flat') {
      items.push(createItem('Flat Roof Framing'));
    } else if (framingScope.roof_framing.roof_type === 'gable') {
      items.push(createItem('Gable Roof Framing'));
    } else if (framingScope.roof_framing.roof_type === 'roof_deck') {
      items.push(createItem('Roof Deck Framing'));
    }
  }

  // ============= ENVELOPE =============

  // Wall Sheathing
  if (framingScope.wall_sheathing.enabled) {
    if (framingScope.wall_sheathing.structural) {
      items.push(createItem('Wall Sheathing – Structural Sheathing'));
    }
    if (framingScope.wall_sheathing.insulated_integrated) {
      items.push(createItem('Wall Sheathing – Insulated/Integrated Sheathing'));
    }
  }

  // Siding
  if (framingScope.siding.enabled) {
    if (framingScope.siding.wood) {
      items.push(createItem('Siding – Wood'));
    }
    if (framingScope.siding.fiber_cement) {
      items.push(createItem('Siding – Fiber Cement'));
    }
    if (framingScope.siding.other && framingScope.siding.other_text) {
      items.push(createItem(`Siding – ${framingScope.siding.other_text}`));
    }
  }

  // Fascia & Soffit
  if (framingScope.fascia_soffit.enabled) {
    if (framingScope.fascia_soffit.tg_wood_soffit) {
      items.push(createItem('T&G Wood Soffit'));
    }
    if (framingScope.fascia_soffit.fiber_cement_soffit) {
      items.push(createItem('Fiber Cement Soffit'));
    }
    if (framingScope.fascia_soffit.wood_fascia) {
      items.push(createItem('Wood Fascia'));
    }
    if (framingScope.fascia_soffit.other && framingScope.fascia_soffit.other_text) {
      items.push(createItem(`Fascia/Soffit – ${framingScope.fascia_soffit.other_text}`));
    }
  }

  // Decorative Exterior
  if (framingScope.decorative_exterior.enabled) {
    if (framingScope.decorative_exterior.corbels) {
      items.push(createItem('Corbels'));
    }
    if (framingScope.decorative_exterior.columns) {
      items.push(createItem('Columns'));
    }
    if (framingScope.decorative_exterior.wood_elements) {
      items.push(createItem('Decorative Exterior – Wood'));
    }
    if (framingScope.decorative_exterior.metal_composite) {
      items.push(createItem('Decorative Exterior – Metal/Composite'));
    }
    if (framingScope.decorative_exterior.other && framingScope.decorative_exterior.other_text) {
      items.push(createItem(`Decorative Exterior – ${framingScope.decorative_exterior.other_text}`));
    }
  }

  // Windows
  if (framingScope.window_installation.enabled) {
    const windowMaterials: string[] = [];
    if (framingScope.window_installation.wood) windowMaterials.push('Wood');
    if (framingScope.window_installation.vinyl_plastic) windowMaterials.push('Vinyl');
    if (framingScope.window_installation.aluminum) windowMaterials.push('Aluminum');
    if (framingScope.window_installation.other && framingScope.window_installation.other_text) {
      windowMaterials.push(framingScope.window_installation.other_text);
    }
    
    if (windowMaterials.length > 0) {
      items.push(createItem(`Window Installation – ${windowMaterials.join('/')}`));
    } else {
      items.push(createItem('Window Installation'));
    }
  }

  // Patio Doors
  if (framingScope.patio_doors.enabled) {
    const doorMaterials: string[] = [];
    if (framingScope.patio_doors.wood) doorMaterials.push('Wood');
    if (framingScope.patio_doors.vinyl_plastic) doorMaterials.push('Vinyl');
    if (framingScope.patio_doors.aluminum) doorMaterials.push('Aluminum');
    if (framingScope.patio_doors.other && framingScope.patio_doors.other_text) {
      doorMaterials.push(framingScope.patio_doors.other_text);
    }
    
    if (doorMaterials.length > 0) {
      items.push(createItem(`Patio Door Installation – ${doorMaterials.join('/')}`));
    } else {
      items.push(createItem('Patio Door Installation'));
    }
  }

  // ============= SITE/BUILDING DETAILS (from ScopeLocation) =============

  // Basement
  if (scopeLocation.basement.enabled) {
    items.push(createItem('Basement Framing'));
    if (scopeLocation.basement.type === 'walkout' || scopeLocation.basement.type === 'garden_level') {
      items.push(createItem('Walkout/Garden Level Details'));
    }
  }

  // Garage
  if (scopeLocation.garage.enabled) {
    const garageType = scopeLocation.garage.type === 'attached' ? 'Attached' : 
                       scopeLocation.garage.type === 'detached' ? 'Detached' : '';
    const garageSize = scopeLocation.garage.size === '1_car' ? '1-Car' :
                       scopeLocation.garage.size === '2_car' ? '2-Car' :
                       scopeLocation.garage.size === '3_car' ? '3-Car' :
                       scopeLocation.garage.size === '4_plus' ? '4+ Car' : '';
    
    const garageParts = [garageType, garageSize].filter(Boolean);
    if (garageParts.length > 0) {
      items.push(createItem(`Garage Framing – ${garageParts.join(' ')}`));
    } else {
      items.push(createItem('Garage Framing'));
    }
  }

  // Stairs
  if (scopeLocation.stairs.enabled) {
    const stairsScope = scopeLocation.stairs.scope;
    if (stairsScope === 'field_built') {
      items.push(createItem('Stairs – Field Built'));
    } else if (stairsScope === 'install_only') {
      items.push(createItem('Stairs – Install Only'));
    } else if (stairsScope === 'both') {
      items.push(createItem('Stairs – Field Built & Install'));
    } else if (stairsScope === 'other' && scopeLocation.stairs.otherText) {
      items.push(createItem(`Stairs – ${scopeLocation.stairs.otherText}`));
    } else {
      items.push(createItem('Stairs'));
    }
  }

  // Exterior Spaces
  if (scopeLocation.exteriorSpaces.enabled) {
    if (scopeLocation.exteriorSpaces.types.covered_deck) {
      items.push(createItem('Covered Deck Framing'));
    }
    if (scopeLocation.exteriorSpaces.types.uncovered_deck) {
      items.push(createItem('Uncovered Deck Framing'));
    }
    if (scopeLocation.exteriorSpaces.types.courtyard) {
      items.push(createItem('Courtyard Framing'));
    }
    if (scopeLocation.exteriorSpaces.types.balcony) {
      items.push(createItem('Balcony Framing'));
    }
    if (scopeLocation.exteriorSpaces.types.patio) {
      items.push(createItem('Patio Framing'));
    }
    if (scopeLocation.exteriorSpaces.types.other && scopeLocation.exteriorSpaces.types.otherText) {
      items.push(createItem(`Exterior – ${scopeLocation.exteriorSpaces.types.otherText}`));
    }
  }

  // Roof/Attic from scope location (if enabled but not covered by framing scope)
  if (scopeLocation.roofAttic.enabled && !framingScope.roof_framing.enabled) {
    const roofType = scopeLocation.roofAttic.roofType;
    if (roofType === 'gable') {
      items.push(createItem('Gable Roof Framing'));
    } else if (roofType === 'hip') {
      items.push(createItem('Hip Roof Framing'));
    } else if (roofType === 'flat') {
      items.push(createItem('Flat Roof Framing'));
    } else if (roofType === 'shed') {
      items.push(createItem('Shed Roof Framing'));
    } else if (roofType === 'other' && scopeLocation.roofAttic.roofOtherText) {
      items.push(createItem(`${scopeLocation.roofAttic.roofOtherText} Roof Framing`));
    } else {
      items.push(createItem('Roof Framing'));
    }
    
    if (scopeLocation.roofAttic.attic === 'finished') {
      items.push(createItem('Finished Attic Framing'));
    } else if (scopeLocation.roofAttic.attic === 'unfinished') {
      items.push(createItem('Attic Framing'));
    }
  }

  // Structural Steel from scope location
  if (scopeLocation.structuralSteel.enabled) {
    // Only add if not already covered by framing scope
    if (!framingScope.structural_framing.enabled) {
      const elements: string[] = [];
      if (scopeLocation.structuralSteel.elements.beams) elements.push('Beams');
      if (scopeLocation.structuralSteel.elements.columns) elements.push('Columns');
      if (scopeLocation.structuralSteel.elements.supports) elements.push('Supports');
      
      if (elements.length > 0) {
        items.push(createItem(`Structural Steel – ${elements.join(', ')}`));
      } else {
        items.push(createItem('Structural Steel'));
      }
    }
  }

  // ============= PROJECT TYPE PRESETS =============

  if (structureType === 'SINGLE_FAMILY' || structureType === 'TOWNHOME') {
    items.push(createItem('Punch / Backout / Blocking'));
  }

  if (structureType === 'APARTMENT' || structureType === 'HOTEL') {
    items.push(createItem('Common Area Framing'));
    items.push(createItem('Corridor Backing/Blocking'));
  }

  // ============= FLOOR-BASED ITEMS (for multi-story) =============

  if (floors > 1) {
    // Add floor framing for each floor above ground
    for (let i = 2; i <= Math.min(floors, 10); i++) {
      const ordinal = getOrdinal(i);
      items.push(createItem(`${ordinal} Floor Framing`));
    }
    if (floors > 10) {
      items.push(createItem('Upper Floors Framing (11+)'));
    }
  }

  // ============= MATERIAL RESPONSIBILITY =============

  if (tcProvidesMaterials) {
    items.push(createItem('Materials (TC Provided)'));
  }

  // ============= FINALIZE =============

  // Update sort orders
  items.forEach((item, index) => {
    item.sort_order = index;
  });

  return items;
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/**
 * Normalize items (update sort_order after reorder/delete)
 */
export function normalizeSovItems(items: SovLineItem[]): SovLineItem[] {
  return items.map((item, index) => ({
    ...item,
    sort_order: index,
  }));
}

/**
 * Create a new blank SOV item
 */
export function createBlankSovItem(): SovLineItem {
  return {
    id: `sov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'New Line Item',
    sort_order: 0,
  };
}
