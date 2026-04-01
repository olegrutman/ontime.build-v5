// ── Material responsibility ──────────────────────────────────────────
export type MaterialResponsibility = 'LABOR_ONLY' | 'FURNISH_INSTALL' | 'SPLIT';

// ── Building type (from project profile) ─────────────────────────────
export type FramingBuildingType = 'SFR' | 'TOWNHOMES' | 'MULTI_FAMILY' | 'HOTEL' | 'COMMERCIAL';

// ── Tri-state for yes/no/na questions ────────────────────────────────
export type YesNoNa = 'yes' | 'no' | 'na' | null;

// ── Opening install mode ─────────────────────────────────────────────
export type OpeningMode = 'GFCI' | 'CFCI' | 'RO_ONLY' | 'NOT_IN_SCOPE' | null;

// ── Blocking inclusion ───────────────────────────────────────────────
export type BlockingStatus = 'IN' | 'EX';

// ── Section answers ──────────────────────────────────────────────────
export interface MethodAnswers {
  material_responsibility: MaterialResponsibility | null;
  framing_method: 'STICK' | 'PANELIZED' | 'HYBRID' | null;
  lumber_grade: string | null;
  mobilization: YesNoNa;
  mobilization_percent: number | null;
}

export interface StructureAnswers {
  wood_stairs: YesNoNa;
  stairs_items: string[];
  elevator_shaft: YesNoNa;
  elevator_items: string[];
  enclosed_corridors: YesNoNa;
  open_breezeways: YesNoNa;
  community_spaces: YesNoNa;
  balconies: YesNoNa;
  balcony_type: 'CANTILEVER' | 'LEDGER_BRACKET' | 'BOTH' | null;
  balcony_items: string[];
  ground_patios: YesNoNa;
  tuck_under_garages: YesNoNa;
  garage_items: string[];
}

export interface SheathingAnswers {
  wall_sheathing_install: YesNoNa;          // LABOR_ONLY
  wall_sheathing_type: string | null;       // FURNISH_INSTALL / SPLIT
  wrb_install: YesNoNa;                     // LABOR_ONLY
  wrb_type: string | null;                  // FURNISH_INSTALL / SPLIT
  wrb_tape_seams: YesNoNa;
  roof_sheathing: YesNoNa;
  roof_underlayment: YesNoNa;
  roof_underlayment_type: string | null;
}

export interface ExteriorAnswers {
  rough_fascia: YesNoNa;
  rough_fascia_items: string[];
  finished_fascia: YesNoNa;
  finished_fascia_material: string | null;
  soffit_nailer: YesNoNa;
  finished_soffit: YesNoNa;
  finished_soffit_material: string | null;
  vented_soffit: YesNoNa;
  frieze_boards: YesNoNa;
  frieze_material: string | null;
  eave_window_trim: YesNoNa;
}

export interface SidingAnswers {
  siding_in_scope: YesNoNa;
  siding_types: string[];
  elevations_mode: string | null;
  elevation_selections: string[];
  elevation_siding_map: Record<string, string>;
  window_trim: YesNoNa;
  window_trim_material: string | null;
  head_flashing: YesNoNa;
  sill_pan: YesNoNa;
  corner_treatment: YesNoNa;
  corner_material: string | null;
  belly_band: YesNoNa;
  siding_accessories: string[];
}

export interface OpeningsAnswers {
  window_mode: OpeningMode;
  window_pan_flashing: YesNoNa;
  window_head_flashing: YesNoNa;
  window_foam_seal: YesNoNa;
  ext_door_mode: OpeningMode;
  door_hardware: YesNoNa;
  patio_doors: YesNoNa;
  patio_door_mode: OpeningMode;
  overhead_doors: YesNoNa;
  overhead_door_type: string | null;
  elevation_variance: YesNoNa;
}

export interface BlockingAnswers {
  residential_standard: Record<string, BlockingStatus>;
  residential_optional: Record<string, BlockingStatus>;
  commercial_items: Record<string, BlockingStatus>;
  backout: YesNoNa;
  backout_pricing: string | null;
}

export interface FireAnswers {
  fire_blocking: YesNoNa;
  draft_stops: YesNoNa;
  firestopping: string | null;
  demising_walls: YesNoNa;
  demising_type: string | null;
  corridor_fire_walls: YesNoNa;
}

export interface HardwareAnswers {
  structural_connectors: YesNoNa;
  connector_supply_detail: string | null;
  anchor_bolts: YesNoNa;
  ledger_bolts: YesNoNa;
  fasteners: YesNoNa;
}

export interface SteelAnswers {
  steel_columns: YesNoNa;
  steel_column_type: string | null;
  steel_beams: YesNoNa;
  beam_type: string | null;
  moment_frames: YesNoNa;
  moment_frame_connections: string | null;
  steel_posts: YesNoNa;
  post_base_plates: YesNoNa;
  lintels: YesNoNa;
  lintel_type: string | null;
  steel_decking: YesNoNa;
  decking_gauge: string | null;
  shear_plates: YesNoNa;
  embed_plates: YesNoNa;
  steel_stairs: YesNoNa;
  steel_railings: YesNoNa;
  erection_method: string | null;
  torque_bolting: YesNoNa;
  welding_onsite: YesNoNa;
  fireproofing: YesNoNa;
  fireproofing_type: string | null;
  touch_up_paint: YesNoNa;
}

export interface DryinAnswers {
  hoisting: string | null;
  temp_tarps: YesNoNa;
  lumber_storage: YesNoNa;
}

export interface CleanupAnswers {
  daily_cleanup: YesNoNa;
  nail_sweep: YesNoNa;
  dumpster: 'YOU' | 'GC' | null;
  frame_walk: YesNoNa;
  inspection_support: YesNoNa;
  warranty: string | null;
}

// ── Combined answers ─────────────────────────────────────────────────
export interface FramingScopeAnswers {
  method: MethodAnswers;
  structure: StructureAnswers;
  steel: SteelAnswers;
  sheathing: SheathingAnswers;
  exterior: ExteriorAnswers;
  siding: SidingAnswers;
  openings: OpeningsAnswers;
  blocking: BlockingAnswers;
  fire: FireAnswers;
  hardware: HardwareAnswers;
  dryin: DryinAnswers;
  cleanup: CleanupAnswers;
}

// ── Section navigation ───────────────────────────────────────────────
export interface SectionDef {
  id: string;
  label: string;
  key: keyof FramingScopeAnswers;
}

export const SECTIONS: SectionDef[] = [
  { id: '1', label: 'Method & Materials', key: 'method' },
  { id: '2', label: 'Building Features', key: 'structure' },
  { id: '3', label: 'Structural Steel', key: 'steel' },
  { id: '4', label: 'Sheathing & WRB', key: 'sheathing' },
  { id: '5', label: 'Fascia, Soffit & Trim', key: 'exterior' },
  { id: '6', label: 'Siding & Cladding', key: 'siding' },
  { id: '7', label: 'Openings', key: 'openings' },
  { id: '8', label: 'Blocking & Backing', key: 'blocking' },
  { id: '9', label: 'Fire & Smoke', key: 'fire' },
  { id: '10', label: 'Hardware & Connectors', key: 'hardware' },
  { id: '11', label: 'Dry-in & Hoisting', key: 'dryin' },
  { id: '12', label: 'Cleanup & Warranty', key: 'cleanup' },
];

// ── Default answers factory ──────────────────────────────────────────
export function createDefaultAnswers(): FramingScopeAnswers {
  return {
    method: { material_responsibility: null, framing_method: null, lumber_grade: null, mobilization: null, mobilization_percent: null },
    structure: { wood_stairs: null, stairs_items: [], elevator_shaft: null, elevator_items: [], enclosed_corridors: null, open_breezeways: null, community_spaces: null, balconies: null, balcony_type: null, balcony_items: [], ground_patios: null, tuck_under_garages: null, garage_items: [] },
    steel: { steel_columns: null, steel_column_type: null, steel_beams: null, beam_type: null, moment_frames: null, moment_frame_connections: null, steel_posts: null, post_base_plates: null, lintels: null, lintel_type: null, steel_decking: null, decking_gauge: null, shear_plates: null, embed_plates: null, steel_stairs: null, steel_railings: null, erection_method: null, torque_bolting: null, welding_onsite: null, fireproofing: null, fireproofing_type: null, touch_up_paint: null },
    sheathing: { wall_sheathing_install: null, wall_sheathing_type: null, wrb_install: null, wrb_type: null, wrb_tape_seams: null, roof_sheathing: null, roof_underlayment: null, roof_underlayment_type: null },
    exterior: { rough_fascia: null, rough_fascia_items: [], finished_fascia: null, finished_fascia_material: null, soffit_nailer: null, finished_soffit: null, finished_soffit_material: null, vented_soffit: null, frieze_boards: null, frieze_material: null, eave_window_trim: null },
    siding: { siding_in_scope: null, siding_types: [], elevations_mode: null, elevation_selections: [], elevation_siding_map: {}, window_trim: null, window_trim_material: null, head_flashing: null, sill_pan: null, corner_treatment: null, corner_material: null, belly_band: null, siding_accessories: [] },
    openings: { window_mode: null, window_pan_flashing: null, window_head_flashing: null, window_foam_seal: null, ext_door_mode: null, door_hardware: null, patio_doors: null, patio_door_mode: null, overhead_doors: null, overhead_door_type: null, elevation_variance: null },
    blocking: { residential_standard: {}, residential_optional: {}, commercial_items: {}, backout: null, backout_pricing: null },
    fire: { fire_blocking: null, draft_stops: null, firestopping: null, demising_walls: null, demising_type: null, corridor_fire_walls: null },
    hardware: { structural_connectors: null, connector_supply_detail: null, anchor_bolts: null, ledger_bolts: null, fasteners: null },
    dryin: { hoisting: null, temp_tarps: null, lumber_storage: null },
    cleanup: { daily_cleanup: null, nail_sweep: null, dumpster: null, frame_walk: null, inspection_support: null, warranty: null },
  };
}

// ── Building-type visibility helpers ─────────────────────────────────
const MULTI_TYPES: FramingBuildingType[] = ['MULTI_FAMILY', 'HOTEL'];
const RESIDENTIAL: FramingBuildingType[] = ['SFR', 'TOWNHOMES', 'MULTI_FAMILY', 'HOTEL'];

export function showElevator(bt: FramingBuildingType) { return MULTI_TYPES.includes(bt); }
export function showCorridors(bt: FramingBuildingType) { return MULTI_TYPES.includes(bt); }
export function showBreezeways(bt: FramingBuildingType) { return bt !== 'SFR'; }
export function showCommunitySpaces(bt: FramingBuildingType) { return MULTI_TYPES.includes(bt); }
export function showBalconies(bt: FramingBuildingType) { return bt !== 'SFR'; }
export function showTuckUnder(bt: FramingBuildingType) { return bt === 'TOWNHOMES' || bt === 'MULTI_FAMILY' || bt === 'SFR'; }
export function showDemising(bt: FramingBuildingType) { return bt === 'TOWNHOMES' || MULTI_TYPES.includes(bt); }
export function showCorridorFireWalls(bt: FramingBuildingType) { return MULTI_TYPES.includes(bt); }
export function showDraftStops(bt: FramingBuildingType) { return MULTI_TYPES.includes(bt) || bt === 'COMMERCIAL'; }
export function isResidential(bt: FramingBuildingType) { return RESIDENTIAL.includes(bt); }
export function isCommercial(bt: FramingBuildingType) { return bt === 'COMMERCIAL'; }
