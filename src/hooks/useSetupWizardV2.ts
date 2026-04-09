import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/* ══════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════ */

export type BuildingType =
  | 'custom_home'
  | 'track_home'
  | 'townhome'
  | 'apartments_mf'
  | 'hotel'
  | 'senior_living';

export const BUILDING_TYPES: { slug: BuildingType; label: string; icon: string; description: string }[] = [
  { slug: 'custom_home', label: 'Custom Home', icon: '🏡', description: 'Single-family custom build' },
  { slug: 'track_home', label: 'Track Home', icon: '🏘️', description: 'Production / spec homes' },
  { slug: 'townhome', label: 'Townhome', icon: '🏠', description: 'Attached multi-story units' },
  { slug: 'apartments_mf', label: 'Apartments / MF', icon: '🏢', description: 'Multifamily 3+ stories' },
  { slug: 'hotel', label: 'Hotel / Hospitality', icon: '🏨', description: 'Hotels, motels, resorts' },
  { slug: 'senior_living', label: 'Senior Living', icon: '🏥', description: 'Assisted living, memory care' },
];

export type InputType = 'yes_no' | 'number' | 'dropdown' | 'yes_no_percent' | 'yes_no_floors' | 'yes_no_subtype';

export type QuestionTag = 'always' | 'conditional' | 'scope_gate' | 'loop_driver';

export interface WizardQuestion {
  id: string;
  phase: SOVPhase;
  label: string;
  inputType: InputType;
  options?: string[];
  tag: QuestionTag;
  conditionalOn?: string; // field_key = value, e.g. "has_balcony=yes"
  buildingTypes: BuildingType[] | 'all';
  fieldKey: string;
}

export type SOVPhase =
  | 'mobilization_steel'
  | 'per_floor'
  | 'roof'
  | 'envelope'
  | 'backout'
  | 'exterior_finish'
  | 'closeout';

export const SOV_PHASE_LABELS: Record<SOVPhase, string> = {
  mobilization_steel: '1 · Mobilization & Structural Steel',
  per_floor: '2 · Per-Floor Structural',
  roof: '3 · Roof Structural',
  envelope: '4 · Exterior Envelope',
  backout: '5 · Backout & Interior',
  exterior_finish: '6 · Exterior Finish',
  closeout: '7 · Closeout',
};

export const SOV_PHASE_ORDER: SOVPhase[] = [
  'mobilization_steel',
  'per_floor',
  'roof',
  'envelope',
  'backout',
  'exterior_finish',
  'closeout',
];

export interface SOVLine {
  lineNumber: number;
  description: string;
  phase: SOVPhase;
  amount: number;
  suggested_pct: number;
  status: 'draft';
  conditionalKey: string | null;
}

export interface SOVValidationWarning {
  lineNumber?: number;
  message: string;
  severity: 'soft' | 'hard';
}

export type Answers = Record<string, any>;

/* ══════════════════════════════════════════════════════════════════════
   QUESTION DEFINITIONS
   ══════════════════════════════════════════════════════════════════════ */

// Shared questions (all building types)
const SHARED_QUESTIONS: WizardQuestion[] = [
  {
    id: 'S0',
    phase: 'mobilization_steel',
    label: 'What is the total contract value?',
    inputType: 'number',
    tag: 'always',
    fieldKey: 'contract_value',
    buildingTypes: 'all',
  },
  {
    id: 'S1',
    phase: 'per_floor',
    label: 'Who is responsible for materials?',
    inputType: 'dropdown',
    options: ['GC supplies materials', 'TC supplies materials', 'Split responsibility'],
    tag: 'always',
    fieldKey: 'material_responsibility',
    buildingTypes: 'all',
  },
  {
    id: 'S_basement',
    phase: 'mobilization_steel',
    label: 'Has basement?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_basement',
    buildingTypes: 'all',
  },
  {
    id: 'S_basement_type',
    phase: 'mobilization_steel',
    label: 'What kind of basement?',
    inputType: 'dropdown',
    options: ['Finished', 'Partially finished', 'Unfinished'],
    tag: 'conditional',
    conditionalOn: 'has_basement=yes',
    fieldKey: 'basement_type',
    buildingTypes: 'all',
  },
  {
    id: 'S_basement_walkout',
    phase: 'mobilization_steel',
    label: 'Is it a walkout basement?',
    inputType: 'yes_no',
    tag: 'conditional',
    conditionalOn: 'has_basement=yes',
    fieldKey: 'basement_walkout',
    buildingTypes: 'all',
  },
  {
    id: 'S2',
    phase: 'mobilization_steel',
    label: 'Mobilization as separate SOV line item?',
    inputType: 'yes_no_percent',
    tag: 'always',
    fieldKey: 'mobilization',
    buildingTypes: 'all',
  },
  {
    id: 'S3',
    phase: 'mobilization_steel',
    label: 'Structural steel in scope?',
    inputType: 'yes_no_floors',
    tag: 'scope_gate',
    fieldKey: 'structural_steel',
    buildingTypes: 'all',
  },
];

// Per-building-type questions
const TYPE_QUESTIONS: WizardQuestion[] = [
  // ─── STORIES (loop driver) ──────────────────────────────────────
  {
    id: 'Q1',
    phase: 'per_floor',
    label: 'Number of stories',
    inputType: 'number',
    tag: 'loop_driver',
    fieldKey: 'stories',
    buildingTypes: ['custom_home', 'apartments_mf', 'hotel', 'senior_living'],
  },
  {
    id: 'Q1_track',
    phase: 'per_floor',
    label: 'Number of stories per plan',
    inputType: 'dropdown',
    options: ['1-story', '2-story', 'Mix of both'],
    tag: 'loop_driver',
    fieldKey: 'stories',
    buildingTypes: ['track_home'],
  },
  {
    id: 'Q1_th',
    phase: 'per_floor',
    label: 'Number of stories per unit',
    inputType: 'dropdown',
    options: ['2', '3'],
    tag: 'loop_driver',
    fieldKey: 'stories',
    buildingTypes: ['townhome'],
  },

  // ─── BASEMENT (moved to SHARED_QUESTIONS as S_basement) ──────

  // ─── FLOOR SYSTEM ──────────────────────────────────────────────
  {
    id: 'Q3',
    phase: 'per_floor',
    label: 'Floor system type',
    inputType: 'dropdown',
    options: ['TJI I-joists', 'Floor trusses', 'Dimensional lumber', 'Slab on grade'],
    tag: 'always',
    fieldKey: 'floor_system',
    buildingTypes: ['custom_home'],
  },
  {
    id: 'Q3_track',
    phase: 'per_floor',
    label: 'Floor system type',
    inputType: 'dropdown',
    options: ['TJI I-joists', 'Floor trusses', 'Slab on grade'],
    tag: 'always',
    fieldKey: 'floor_system',
    buildingTypes: ['track_home'],
  },
  {
    id: 'Q3_th',
    phase: 'per_floor',
    label: 'Floor system type',
    inputType: 'dropdown',
    options: ['TJI I-joists', 'Floor trusses'],
    tag: 'always',
    fieldKey: 'floor_system',
    buildingTypes: ['townhome', 'senior_living'],
  },
  {
    id: 'Q3_mf',
    phase: 'per_floor',
    label: 'Floor system type',
    inputType: 'dropdown',
    options: ['TJI I-joists', 'Floor trusses', 'Concrete topping on wood'],
    tag: 'always',
    fieldKey: 'floor_system',
    buildingTypes: ['apartments_mf'],
  },
  {
    id: 'Q3_hotel',
    phase: 'per_floor',
    label: 'Floor system type',
    inputType: 'dropdown',
    options: ['TJI I-joists', 'Floor trusses', 'Concrete on metal deck'],
    tag: 'always',
    fieldKey: 'floor_system',
    buildingTypes: ['hotel'],
  },

  // ─── GARAGE ────────────────────────────────────────────────────
  {
    id: 'Q4_garage',
    phase: 'per_floor',
    label: 'Has attached or detached garage?',
    inputType: 'yes_no_subtype',
    options: ['Attached', 'Detached', 'Tuck-under'],
    tag: 'conditional',
    fieldKey: 'has_garage',
    buildingTypes: ['custom_home'],
  },
  {
    id: 'Q4_track_garage',
    phase: 'per_floor',
    label: 'Garage type',
    inputType: 'dropdown',
    options: ['Attached', 'Tuck-under', 'No garage'],
    tag: 'conditional',
    fieldKey: 'garage_type',
    buildingTypes: ['track_home'],
  },
  {
    id: 'Q4_th_garage',
    phase: 'per_floor',
    label: 'Has tuck-under or attached garage?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_garage',
    buildingTypes: ['townhome'],
  },

  // ─── ELEVATOR ──────────────────────────────────────────────────
  {
    id: 'Q5_elevator',
    phase: 'per_floor',
    label: 'Elevator shaft in scope?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_elevator',
    buildingTypes: ['townhome', 'apartments_mf', 'hotel', 'senior_living'],
  },

  // ─── STAIRS ────────────────────────────────────────────────────
  {
    id: 'Q6_stairs',
    phase: 'per_floor',
    label: 'Number of stair towers',
    inputType: 'number',
    tag: 'conditional',
    fieldKey: 'stair_towers',
    buildingTypes: ['townhome', 'apartments_mf', 'hotel', 'senior_living'],
  },

  // ─── ROOF: PARAPET & ROOF DECK ─────────────────────────────────
  {
    id: 'Q7_parapet',
    phase: 'roof',
    label: 'Has parapet walls?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_parapet',
    buildingTypes: ['townhome', 'apartments_mf', 'hotel', 'senior_living'],
  },
  {
    id: 'Q7_roof_deck',
    phase: 'roof',
    label: 'Has roof decks (flat roof sections)?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_roof_deck',
    buildingTypes: ['townhome', 'apartments_mf'],
  },

  // ─── BACKOUT GATE ────────────────────────────────────────────
  {
    id: 'Q_backout_gate',
    phase: 'backout',
    label: 'Is backout (return after MEP rough-in) in your scope?',
    inputType: 'yes_no',
    tag: 'scope_gate',
    fieldKey: 'has_backout',
    buildingTypes: 'all',
  },

  // ─── SIDING GATE ──────────────────────────────────────────────
  {
    id: 'Q9_siding',
    phase: 'exterior_finish',
    label: 'Siding in scope?',
    inputType: 'yes_no',
    tag: 'scope_gate',
    fieldKey: 'siding_in_scope',
    buildingTypes: 'all',
  },
  {
    id: 'Q9a_coverage',
    phase: 'exterior_finish',
    label: 'Siding scope coverage',
    inputType: 'dropdown',
    options: ['Whole building', 'Per elevation (Front · Left · Right · Rear)'],
    tag: 'conditional',
    conditionalOn: 'siding_in_scope=yes',
    fieldKey: 'siding_coverage',
    buildingTypes: 'all',
  },

  // ─── WINDOWS & DOORS ──────────────────────────────────────────
  {
    id: 'Q8_windows',
    phase: 'envelope',
    label: 'Windows & doors install in scope?',
    inputType: 'yes_no',
    tag: 'scope_gate',
    fieldKey: 'windows_in_scope',
    buildingTypes: 'all',
  },
  {
    id: 'Q8a_mode',
    phase: 'envelope',
    label: 'Install mode',
    inputType: 'dropdown',
    options: ['Install only', 'Furnish & install', 'RO only'],
    tag: 'conditional',
    conditionalOn: 'windows_in_scope=yes',
    fieldKey: 'window_install_mode',
    buildingTypes: 'all',
  },

  // ─── BALCONY / DECK / PORCH ───────────────────────────────────
  {
    id: 'Q10_balcony',
    phase: 'exterior_finish',
    label: 'Has balcony, deck, or porch?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_balcony',
    buildingTypes: ['custom_home'],
  },
  {
    id: 'Q10_track_porch',
    phase: 'exterior_finish',
    label: 'Has covered entry or front porch?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_balcony',
    buildingTypes: ['track_home'],
  },
  {
    id: 'Q10_th_balcony',
    phase: 'exterior_finish',
    label: 'Has balconies or decks?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_balcony',
    buildingTypes: ['townhome'],
  },
  {
    id: 'Q10_mf_balcony',
    phase: 'exterior_finish',
    label: 'Has balconies?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_balcony',
    buildingTypes: ['apartments_mf', 'hotel'],
  },
  {
    id: 'Q10_sl_porch',
    phase: 'exterior_finish',
    label: 'Has covered porches or screened entries?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_balcony',
    buildingTypes: ['senior_living'],
  },
  {
    id: 'Q10a_decking_gate',
    phase: 'exterior_finish',
    label: 'Decking in scope?',
    inputType: 'yes_no',
    tag: 'scope_gate',
    conditionalOn: 'has_balcony=yes',
    fieldKey: 'decking_in_scope',
    buildingTypes: 'all',
  },
  {
    id: 'Q10b_decking_material',
    phase: 'exterior_finish',
    label: 'Decking material',
    inputType: 'dropdown',
    options: ['Composite (Trex)', 'Pressure treated', 'IPE hardwood', 'Concrete slab'],
    tag: 'conditional',
    conditionalOn: 'decking_in_scope=yes',
    fieldKey: 'decking_material',
    buildingTypes: ['custom_home', 'townhome', 'apartments_mf'],
  },
  {
    id: 'Q10b_track_material',
    phase: 'exterior_finish',
    label: 'Decking material',
    inputType: 'dropdown',
    options: ['Composite (Trex)', 'Pressure treated', 'IPE', 'Concrete slab'],
    tag: 'conditional',
    conditionalOn: 'decking_in_scope=yes',
    fieldKey: 'decking_material',
    buildingTypes: ['track_home'],
  },
  {
    id: 'Q10b_hotel_material',
    phase: 'exterior_finish',
    label: 'Balcony decking material',
    inputType: 'dropdown',
    options: ['Composite (Trex)', 'Pressure treated', 'IPE', 'Concrete slab', 'Metal grating'],
    tag: 'conditional',
    conditionalOn: 'decking_in_scope=yes',
    fieldKey: 'decking_material',
    buildingTypes: ['hotel'],
  },
  {
    id: 'Q10b_sl_material',
    phase: 'exterior_finish',
    label: 'Porch decking material',
    inputType: 'dropdown',
    options: ['Composite (Trex)', 'Pressure treated', 'Concrete slab'],
    tag: 'conditional',
    conditionalOn: 'decking_in_scope=yes',
    fieldKey: 'decking_material',
    buildingTypes: ['senior_living'],
  },

  // ─── ROOFTOP DECK ─────────────────────────────────────────────
  {
    id: 'Q11_rooftop',
    phase: 'roof',
    label: 'Has rooftop deck?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_rooftop_deck',
    buildingTypes: ['custom_home', 'townhome', 'apartments_mf'],
  },
  {
    id: 'Q11a_rooftop_decking',
    phase: 'exterior_finish',
    label: 'Rooftop decking in scope?',
    inputType: 'yes_no',
    tag: 'scope_gate',
    conditionalOn: 'has_rooftop_deck=yes',
    fieldKey: 'rooftop_decking_in_scope',
    buildingTypes: ['custom_home', 'townhome', 'apartments_mf'],
  },

  // ─── DECORATIVE ───────────────────────────────────────────────
  {
    id: 'Q12_decorative',
    phase: 'exterior_finish',
    label: 'Decorative exterior items?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_decorative',
    buildingTypes: ['custom_home'],
  },

  // ─── COVERED ENTRY (TH / Track) ──────────────────────────────
  {
    id: 'Q14_entry',
    phase: 'exterior_finish',
    label: 'Has covered entry or porch?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_covered_entry',
    buildingTypes: ['townhome'],
  },

  // ─── HOTEL-SPECIFIC ───────────────────────────────────────────
  {
    id: 'Q12_porte',
    phase: 'exterior_finish',
    label: 'Has porte-cochère or entry canopy?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_porte_cochere',
    buildingTypes: ['hotel'],
  },
  {
    id: 'Q13_pool',
    phase: 'exterior_finish',
    label: 'Has pool deck or amenity framing?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_pool_deck',
    buildingTypes: ['hotel'],
  },

  // ─── MF-SPECIFIC ──────────────────────────────────────────────
  {
    id: 'Q13_breezeway',
    phase: 'exterior_finish',
    label: 'Open breezeways or exterior walkways?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_breezeways',
    buildingTypes: ['apartments_mf'],
  },
  {
    id: 'Q14_amenity',
    phase: 'exterior_finish',
    label: 'Amenity or clubhouse building?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_amenity_building',
    buildingTypes: ['apartments_mf', 'senior_living'],
  },

  // ─── SENIOR LIVING ADA ────────────────────────────────────────
  {
    id: 'Q10_ada',
    phase: 'backout',
    label: 'ADA blocking scope',
    inputType: 'dropdown',
    options: ['Standard package', 'Full ADA (toilet + shower + corridor + fold-down seat)'],
    tag: 'always',
    fieldKey: 'ada_blocking',
    buildingTypes: ['senior_living'],
  },
];

const ALL_QUESTIONS = [...SHARED_QUESTIONS, ...TYPE_QUESTIONS];

/* ══════════════════════════════════════════════════════════════════════
   VISIBILITY LOGIC
   ══════════════════════════════════════════════════════════════════════ */

function matchesBuildingType(q: WizardQuestion, bt: BuildingType): boolean {
  return q.buildingTypes === 'all' || q.buildingTypes.includes(bt);
}

function evaluateCondition(cond: string | undefined, answers: Answers): boolean {
  if (!cond) return true;
  const m = cond.match(/^(\w+)=(.+)$/);
  if (!m) return true;
  const [, key, val] = m;
  return String(answers[key] ?? '').toLowerCase() === val.toLowerCase();
}

export function getVisibleQuestions(bt: BuildingType, answers: Answers): WizardQuestion[] {
  // Deduplicate by fieldKey (first matching question per fieldKey wins)
  const seen = new Set<string>();
  const result: WizardQuestion[] = [];
  for (const q of ALL_QUESTIONS) {
    if (!matchesBuildingType(q, bt)) continue;
    if (!evaluateCondition(q.conditionalOn, answers)) continue;
    if (seen.has(q.fieldKey)) continue;
    seen.add(q.fieldKey);
    result.push(q);
  }
  return result;
}

/* ══════════════════════════════════════════════════════════════════════
   SOV LINE GENERATION
   ══════════════════════════════════════════════════════════════════════ */

/* ── Weight tables by building type ─────────────────────────────── */

type WeightKey =
  | 'mobilization' | 'structural_steel' | 'beam_pockets'
  | 'basement_steel' | 'basement_floor' | 'basement_wall' | 'basement_hw'
  | 'floor_system' | 'floor_sheathing' | 'wall_framing' | 'hardware'
  | 'elevator' | 'stairs' | 'garage'
  | 'roof_framing' | 'roof_sheathing' | 'parapet' | 'roof_deck_struct'
  | 'wrb' | 'windows_install' | 'windows_fi' | 'windows_ro'
  | 'mep_backout' | 'blocking' | 'fire_blocking' | 'shim_shave' | 'ada_std' | 'ada_full'
  | 'siding_whole' | 'siding_elev' | 'fascia_soffit' | 'trim'
  | 'balcony_framing' | 'decking_composite' | 'decking_pt' | 'decking_concrete'
  | 'rooftop_deck_framing' | 'rooftop_decking'
  | 'decorative' | 'covered_entry' | 'porte_cochere' | 'pool_deck'
  | 'breezeways' | 'amenity_building'
  | 'frame_walk' | 'nail_sweep' | 'final_punch'
  | 'fire_wall' | 'oh_door_bucks';

// Default mid-range weights — building type overrides below
const BASE_WEIGHTS: Partial<Record<WeightKey, number>> = {
  mobilization: 4,
  structural_steel: 3,
  beam_pockets: 0.75,
  basement_steel: 1.5, basement_floor: 4, basement_wall: 6, basement_hw: 1.5,
  floor_system: 0, floor_sheathing: 0, wall_framing: 0, hardware: 0, // per-floor — set dynamically
  elevator: 0, stairs: 0, garage: 3,
  roof_framing: 5.5, roof_sheathing: 2.5, parapet: 2, roof_deck_struct: 2,
  wrb: 2, windows_install: 2.5, windows_fi: 5.5, windows_ro: 1.25,
  mep_backout: 7, blocking: 2.5, fire_blocking: 2, shim_shave: 2, ada_std: 2.5, ada_full: 4.5,
  siding_whole: 4, siding_elev: 1.5, fascia_soffit: 3, trim: 1.5,
  balcony_framing: 1.5, decking_composite: 1.5, decking_pt: 0.75, decking_concrete: 1.25,
  rooftop_deck_framing: 2, rooftop_decking: 1.5,
  decorative: 2, covered_entry: 1.5, porte_cochere: 2, pool_deck: 1.5,
  breezeways: 1.5, amenity_building: 4.5,
  frame_walk: 2, nail_sweep: 0.375, final_punch: 1.125,
  fire_wall: 1.5, oh_door_bucks: 0.5,
};

// Per-floor weight distribution (% of the floor's slice)
const FLOOR_INNER_WEIGHTS = {
  floor_system: 27.5,
  floor_sheathing: 11.5,
  wall_framing: 42.5,
  hardware: 7.5,
  elevator: 8.5,
  stairs: 10,
};

// Building-type overrides for specific weights
const BT_OVERRIDES: Record<BuildingType, Partial<Record<WeightKey, number>>> = {
  custom_home: { mobilization: 3.5, mep_backout: 6, roof_framing: 6 },
  track_home: { mobilization: 3, mep_backout: 7, roof_framing: 5.5 },
  townhome: { mobilization: 4, mep_backout: 8, roof_framing: 5.5, fire_blocking: 2.5 },
  apartments_mf: { mobilization: 5, mep_backout: 9, wrb: 2.5, roof_framing: 5 },
  hotel: { mobilization: 5, mep_backout: 10, wrb: 2.5, roof_framing: 4.5 },
  senior_living: { mobilization: 5, mep_backout: 9, wrb: 2.5, roof_framing: 5 },
};

// Phase 2 total allocation by story count (% of contract)
function getPhase2Total(storyCount: number): number {
  if (storyCount <= 1) return 38;
  if (storyCount === 2) return 44;
  if (storyCount === 3) return 50;
  if (storyCount === 4) return 54;
  return 58; // 5+
}

// Labor-only reduction multipliers for material-heavy lines
const LABOR_ONLY_REDUCTIONS: Partial<Record<WeightKey, number>> = {
  floor_system: 0.60,
  floor_sheathing: 0.40,
  roof_sheathing: 0.40,
  siding_whole: 0.55,
  siding_elev: 0.55,
  wrb: 0.50,
  windows_fi: 0.65,
  windows_install: 0, // no change
  decking_composite: 0.55,
  decking_pt: 0.55,
};

export function generateSOVLines(bt: BuildingType, answers: Answers): SOVLine[] {
  const a = answers;
  const contractValue = typeof a.contract_value === 'number' ? a.contract_value : 0;
  const isLaborOnly = a.material_responsibility === 'GC supplies materials';

  const w = (key: WeightKey): number => {
    const val = BT_OVERRIDES[bt]?.[key] ?? BASE_WEIGHTS[key] ?? 0;
    if (isLaborOnly && LABOR_ONLY_REDUCTIONS[key]) {
      return val * (1 - LABOR_ONLY_REDUCTIONS[key]!);
    }
    return val;
  };

  // Collect raw weighted lines
  const rawLines: { desc: string; phase: SOVPhase; weight: number; key: string | null }[] = [];
  const push = (phase: SOVPhase, desc: string, wt: number, key: string | null = null) => {
    if (wt > 0) rawLines.push({ desc, phase, weight: wt, key });
  };

  const floorSystem = a.floor_system || 'TJI I-joists';

  let storyCount = 1;
  if (typeof a.stories === 'number') storyCount = Math.max(1, a.stories);
  else if (a.stories === '2-story' || a.stories === '2') storyCount = 2;
  else if (a.stories === '3') storyCount = 3;
  else if (a.stories === 'Mix of both') storyCount = 2;
  else if (a.stories === '1-story') storyCount = 1;

  // ─── Phase 1: Mobilization & Steel ──────────────────────────
  if (a.mobilization === 'yes' || (typeof a.mobilization === 'object' && a.mobilization?.enabled)) {
    const pct = typeof a.mobilization === 'object' ? a.mobilization.percent : '';
    const mobWeight = pct ? parseFloat(pct) : w('mobilization');
    push('mobilization_steel', `Mobilization${pct ? ` (${pct}% of contract)` : ''}`, mobWeight, 'mobilization');
  }

  if (a.structural_steel === 'yes' || (typeof a.structural_steel === 'object' && a.structural_steel?.enabled)) {
    const floors: string[] = (typeof a.structural_steel === 'object' && Array.isArray(a.structural_steel?.floors))
      ? a.structural_steel.floors
      : ['L1'];
    const perFloorWeight = w('structural_steel') / Math.max(1, floors.length);
    for (const f of floors) {
      push('mobilization_steel', `Structural steel — ${f}`, perFloorWeight, 'structural_steel');
    }
  }

  // Basement level
  if (a.has_basement === 'yes') {
    push('per_floor', `Floor system (${floorSystem}) — Basement`, w('basement_floor'), 'has_basement');
    push('per_floor', 'Hardware & connectors — Basement', w('basement_hw'), 'has_basement');
    if (a.basement_walkout === 'yes') {
      push('per_floor', 'Exterior wall framing — Basement', w('basement_wall'), 'basement_walkout');
    }
    if (a.basement_type === 'Finished' || a.basement_type === 'Partially finished') {
      push('per_floor', 'Interior wall framing — Basement', w('basement_wall') * 0.6, 'basement_type');
    }
  }

  // ─── Phase 2: Per-Floor Structural ──────────────────────────
  const phase2Total = getPhase2Total(storyCount);
  const perFloorAllocation = phase2Total / storyCount;

  for (let i = 1; i <= storyCount; i++) {
    const label = `L${i}`;
    const fi = FLOOR_INNER_WEIGHTS;

    const floorSysW = perFloorAllocation * fi.floor_system / 100;
    const floorSheathW = perFloorAllocation * fi.floor_sheathing / 100;
    const wallW = perFloorAllocation * fi.wall_framing / 100;
    const hwW = perFloorAllocation * fi.hardware / 100;

    push('per_floor', `Floor system (${floorSystem}) — ${label}`,
      isLaborOnly ? floorSysW * (1 - (LABOR_ONLY_REDUCTIONS.floor_system || 0)) : floorSysW);
    push('per_floor', `Floor sheathing — ${label}`,
      isLaborOnly ? floorSheathW * (1 - (LABOR_ONLY_REDUCTIONS.floor_sheathing || 0)) : floorSheathW);
    push('per_floor', `Wall framing — ${label}`, wallW);
    push('per_floor', `Hardware & connectors — ${label}`, hwW);

    if (a.has_elevator === 'yes') {
      push('per_floor', `Elevator hoistway framing — ${label}`, perFloorAllocation * fi.elevator / 100, 'has_elevator');
    }
    if ((a.stair_towers ?? 0) > 0) {
      push('per_floor', `Stair tower framing — ${label} (×${a.stair_towers})`, perFloorAllocation * fi.stairs / 100, 'stair_towers');
    }
    if (i === 1 && (a.has_garage === 'yes' || (a.has_garage as any)?.enabled === true || (a.garage_type && a.garage_type !== 'No garage'))) {
      const gType = a.garage_type || (typeof a.has_garage === 'object' ? a.has_garage.subtype : 'Attached');
      push('per_floor', `Garage framing — ${gType || 'Attached'}`, w('garage'), 'has_garage');
      if (bt === 'townhome') {
        push('per_floor', 'Fire wall framing', w('fire_wall'), 'has_garage');
        push('per_floor', 'OH door bucks', w('oh_door_bucks'), 'has_garage');
      }
    }
  }

  // ─── Phase 3: Roof ──────────────────────────────────────────
  push('roof', 'Roof framing', w('roof_framing'));
  push('roof', 'Roof sheathing', w('roof_sheathing'));
  if (a.has_parapet === 'yes') {
    push('roof', 'Parapet wall framing', w('parapet'), 'has_parapet');
  }
  if (a.has_roof_deck === 'yes') {
    push('roof', 'Roof deck framing', w('roof_deck_struct'), 'has_roof_deck');
  }

  // ─── Phase 4: Envelope ──────────────────────────────────────
  push('envelope', 'WRB (weather-resistive barrier)', w('wrb'));
  if (a.windows_in_scope === 'yes') {
    const mode = a.window_install_mode || 'Install only';
    const winKey: WeightKey = mode === 'RO only' ? 'windows_ro'
      : mode === 'Furnish & install' ? 'windows_fi' : 'windows_install';
    push('envelope', `Windows & doors — ${mode}`, w(winKey), 'windows_in_scope');
  }

  // ─── Phase 5: Backout & Interior ────────────────────────────
  if (a.has_backout === 'yes') {
    push('backout', 'MEP backout', w('mep_backout'), 'has_backout');
    push('backout', 'Blocking', w('blocking'), 'has_backout');
    push('backout', 'Fire blocking', w('fire_blocking'), 'has_backout');
    push('backout', 'Shim & shave', w('shim_shave'), 'has_backout');

    if (bt === 'senior_living') {
      const adaScope = a.ada_blocking || 'Standard package';
      const adaKey: WeightKey = adaScope.includes('Full') ? 'ada_full' : 'ada_std';
      push('backout', `ADA blocking — ${adaScope}`, w(adaKey), 'ada_blocking');
    }
  }

  // ─── Phase 6: Exterior Finish ───────────────────────────────
  if (a.siding_in_scope === 'yes') {
    if (a.siding_coverage === 'Per elevation (Front · Left · Right · Rear)') {
      for (const elev of ['Front', 'Left', 'Right', 'Rear']) {
        push('exterior_finish', `Siding — ${elev} elevation`, w('siding_elev'), 'siding_in_scope');
      }
    } else {
      push('exterior_finish', 'Siding — whole building', w('siding_whole'), 'siding_in_scope');
    }
  }

  push('exterior_finish', 'Fascia & soffit', w('fascia_soffit'));
  push('exterior_finish', 'Trim', w('trim'));

  if (a.has_balcony === 'yes') {
    const deckLabel = bt === 'senior_living' ? 'Porch / screened entry framing'
      : bt === 'track_home' ? 'Porch / entry framing'
      : bt === 'apartments_mf' || bt === 'hotel' ? 'Balcony framing'
      : 'Balcony / deck / porch framing';
    push('exterior_finish', deckLabel, w('balcony_framing'), 'has_balcony');

    if (a.decking_in_scope === 'yes') {
      const mat = a.decking_material || 'Composite (Trex)';
      const deckKey: WeightKey = mat.includes('Composite') ? 'decking_composite'
        : mat.includes('Concrete') ? 'decking_concrete' : 'decking_pt';
      push('exterior_finish', `Decking finish — ${mat}`, w(deckKey), 'decking_in_scope');
    }
  }

  if (a.has_rooftop_deck === 'yes') {
    push('exterior_finish', 'Rooftop deck framing', w('rooftop_deck_framing'), 'has_rooftop_deck');
    if (a.rooftop_decking_in_scope === 'yes') {
      push('exterior_finish', 'Rooftop decking finish', w('rooftop_decking'), 'rooftop_decking_in_scope');
    }
  }

  if (a.has_decorative === 'yes') push('exterior_finish', 'Decorative exterior (columns, corbels, shutters)', w('decorative'), 'has_decorative');
  if (a.has_covered_entry === 'yes') push('exterior_finish', 'Covered entry framing', w('covered_entry'), 'has_covered_entry');
  if (a.has_porte_cochere === 'yes') push('exterior_finish', 'Porte-cochère / entry canopy framing', w('porte_cochere'), 'has_porte_cochere');
  if (a.has_pool_deck === 'yes') push('exterior_finish', 'Pool deck / amenity framing', w('pool_deck'), 'has_pool_deck');
  if (a.has_breezeways === 'yes') push('exterior_finish', 'Breezeway / open corridor framing', w('breezeways'), 'has_breezeways');
  if (a.has_amenity_building === 'yes') push('exterior_finish', 'Amenity / clubhouse building framing', w('amenity_building'), 'has_amenity_building');

  // ─── Phase 7: Closeout ──────────────────────────────────────
  push('closeout', 'Frame walk', w('frame_walk'));
  push('closeout', 'Nail sweep', w('nail_sweep'));
  push('closeout', 'Final punch', w('final_punch'));

  // ─── Normalize to 100% (with mobilization override) ──────
  const rawTotal = rawLines.reduce((s, l) => s + l.weight, 0);
  if (rawTotal <= 0) return [];

  // Check if user entered a fixed mobilization %
  const userMobPct = (typeof a.mobilization === 'object' && a.mobilization?.percent)
    ? parseFloat(a.mobilization.percent) : 0;
  const mobIdx = userMobPct > 0 ? rawLines.findIndex(r => r.key === 'mobilization') : -1;

  const scale = 100 / rawTotal;

  // Build final lines with normalized percentages
  const lines: SOVLine[] = [];
  let pctSum = 0;

  // If user set mob %, calculate how much the rest gets
  const remainingPctPool = mobIdx >= 0 ? (100 - userMobPct) : 100;
  const nonMobTotal = mobIdx >= 0
    ? rawLines.reduce((s, l, idx) => s + (idx === mobIdx ? 0 : l.weight), 0)
    : rawTotal;
  const nonMobScale = nonMobTotal > 0 ? remainingPctPool / nonMobTotal : 0;

  for (let i = 0; i < rawLines.length; i++) {
    const r = rawLines[i];
    let pct: number;
    if (i === rawLines.length - 1) {
      pct = Math.round((100 - pctSum) * 100) / 100;
    } else if (i === mobIdx) {
      // User-entered mobilization % — use exactly
      pct = Math.round(userMobPct * 100) / 100;
      pctSum += pct;
    } else {
      const sc = mobIdx >= 0 ? nonMobScale : scale;
      pct = Math.round(r.weight * sc * 100) / 100;
      pctSum += pct;
    }

    let amount = 0;
    if (contractValue > 0) {
      amount = Math.round(contractValue * pct / 100 * 100) / 100;
    }

    lines.push({
      lineNumber: i + 1,
      description: r.desc,
      phase: r.phase,
      amount,
      suggested_pct: pct,
      status: 'draft',
      conditionalKey: r.key,
    });
  }

  // Fix dollar rounding — last line absorbs remainder
  if (contractValue > 0 && lines.length > 0) {
    const allocated = lines.slice(0, -1).reduce((s, l) => s + l.amount, 0);
    lines[lines.length - 1].amount = Math.round((contractValue - allocated) * 100) / 100;
  }

  return lines;
}

/** Validate SOV and return warnings */
export function validateSOV(lines: SOVLine[], contractValue: number, bt: BuildingType): SOVValidationWarning[] {
  const warnings: SOVValidationWarning[] = [];
  if (lines.length === 0) return warnings;

  // Single line > 20%
  for (const l of lines) {
    if (l.suggested_pct > 20) {
      warnings.push({ lineNumber: l.lineNumber, message: `"${l.description}" is ${l.suggested_pct}% — exceeds 20% threshold`, severity: 'soft' });
    }
  }

  // Mobilization > 10%
  const mobLines = lines.filter(l => l.description.toLowerCase().includes('mobilization'));
  const mobTotal = mobLines.reduce((s, l) => s + l.suggested_pct, 0);
  if (mobTotal > 10) {
    warnings.push({ message: `Mobilization total ${mobTotal}% exceeds 10% hard cap`, severity: 'hard' });
  }

  // Closeout < 2% or < $2000
  const closeoutLines = lines.filter(l => l.phase === 'closeout');
  const closeoutPct = closeoutLines.reduce((s, l) => s + l.suggested_pct, 0);
  const closeoutAmt = closeoutLines.reduce((s, l) => s + l.amount, 0);
  if (closeoutPct < 2 || (contractValue > 0 && closeoutAmt < 2000)) {
    warnings.push({ message: `Closeout total is ${closeoutPct.toFixed(1)}% ($${closeoutAmt.toLocaleString()}) — recommend at least 2% or $2,000`, severity: 'soft' });
  }

  // MEP backout < 6% on MF/Hotel/Senior
  const isMFCommercial = ['apartments_mf', 'hotel', 'senior_living', 'townhome'].includes(bt);
  if (isMFCommercial) {
    const backoutLine = lines.find(l => l.description.toLowerCase().includes('mep backout'));
    if (backoutLine && backoutLine.suggested_pct < 6) {
      warnings.push({ lineNumber: backoutLine.lineNumber, message: `MEP backout at ${backoutLine.suggested_pct}% — under-pricing backout is the #1 reason framers lose money on MF/commercial jobs`, severity: 'soft' });
    }
  }

  return warnings;
}

export const WIZARD_STEPS = [
  { key: 'building_type', label: 'Building Type' },
  { key: 'structure', label: 'Structure' },
  { key: 'roof', label: 'Roof' },
  { key: 'envelope', label: 'Envelope' },
  { key: 'backout', label: 'Backout' },
  { key: 'exterior', label: 'Exterior' },
  { key: 'review', label: 'Review' },
] as const;

/* ══════════════════════════════════════════════════════════════════════
   MAIN HOOK
   ══════════════════════════════════════════════════════════════════════ */

export function useSetupWizardV2(projectId?: string) {
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<Answers>({});
  const [buildingType, setBuildingType] = useState<BuildingType | null>(null);

  const visibleQuestions = useMemo(
    () => buildingType ? getVisibleQuestions(buildingType, answers) : [],
    [buildingType, answers],
  );

  const sovLines = useMemo(
    () => buildingType ? generateSOVLines(buildingType, answers) : [],
    [buildingType, answers],
  );

  const setAnswer = useCallback((fieldKey: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldKey]: value }));
  }, []);

  const selectBuildingType = useCallback((bt: BuildingType) => {
    setBuildingType(bt);
    setAnswers({});
  }, []);

  // Helper: create or update a single contract + SOV
  const _saveContractAndSov = useCallback(async (
    pid: string,
    contractValue: number,
    fromRole: string,
    fromOrgId: string | null,
    toRole: string | null,
    toOrgId: string | null,
    sovName: string,
    scopeData: any,
    sovLineAnswers: Answers,
    createdByUserId?: string,
  ) => {
    // Upsert contract
    const { data: newContract, error: cErr } = await supabase.from('project_contracts').insert({
      project_id: pid,
      contract_sum: contractValue,
      from_org_id: fromOrgId,
      from_role: fromRole,
      to_org_id: toOrgId,
      to_role: toRole,
      trade: null,
      material_responsibility: sovLineAnswers.material_responsibility || null,
      status: 'Active',
      created_by_user_id: createdByUserId || null,
    }).select('id').single();
    if (cErr) throw cErr;
    const contractId = newContract.id;

    // Create SOV
    const { data: newSov, error: sErr } = await supabase.from('project_sov').insert({
      project_id: pid,
      contract_id: contractId,
      sov_name: sovName,
      scope_snapshot: scopeData,
    }).select('id').single();
    if (sErr) throw sErr;
    const sovId = newSov.id;

    // Generate and insert SOV items
    const currentSovLines = generateSOVLines(buildingType!, { ...sovLineAnswers, contract_value: contractValue });
    const sovItems = currentSovLines.map((line) => ({
      project_id: pid,
      sov_id: sovId,
      item_name: line.description,
      item_group: SOV_PHASE_LABELS[line.phase],
      sort_order: line.lineNumber,
      percent_of_contract: line.suggested_pct,
      value_amount: line.amount,
      scheduled_value: line.amount,
      remaining_amount: line.amount,
      source: 'wizard_v2',
      scope_section_slug: line.conditionalKey,
      ai_original_pct: line.suggested_pct,
      default_enabled: true,
    }));

    if (sovItems.length > 0) {
      const { error: iErr } = await supabase.from('project_sov_items').insert(sovItems);
      if (iErr) throw iErr;
    }

    return { contractId, sovId };
  }, [buildingType]);

  // Internal save logic — can be called with an explicit project ID
  const _saveToDb = useCallback(async (pid: string, creatorOrgId?: string, creatorOrgType?: string, userId?: string) => {
    if (!buildingType) throw new Error('No building type selected');
    const contractValue = typeof answers.contract_value === 'number' ? answers.contract_value : 0;
    const fcContractValue = typeof answers.fc_contract_value === 'number' ? answers.fc_contract_value : 0;
    const isTC = creatorOrgType === 'TC';

    // Save answers
    const answerRows = Object.entries(answers).map(([field_key, value]) => ({
      project_id: pid,
      field_key,
      value,
      updated_at: new Date().toISOString(),
    }));
    answerRows.push({
      project_id: pid,
      field_key: 'building_type',
      value: buildingType,
      updated_at: new Date().toISOString(),
    });

    if (answerRows.length > 0) {
      const { error } = await supabase
        .from('project_setup_answers')
        .upsert(answerRows as any, { onConflict: 'project_id,field_key' });
      if (error) throw error;
    }

    // Update project type
    await supabase.from('projects').update({ project_type: buildingType }).eq('id', pid);

    // Save scope_selections as JSON blob
    const scopeData = { building_type: buildingType, ...answers };
    await supabase.from('project_setup_answers').upsert({
      project_id: pid,
      field_key: 'scope_selections_v2',
      value: scopeData,
      updated_at: new Date().toISOString(),
    } as any, { onConflict: 'project_id,field_key' });

    // ── Create contract(s) + SOV(s) ──
    const fromRole = creatorOrgType === 'GC' ? 'General Contractor'
      : creatorOrgType === 'TC' ? 'Trade Contractor'
      : creatorOrgType === 'FC' ? 'Field Crew'
      : 'Trade Contractor';

    // Primary contract (GC→TC for TC creators, or single contract for GC creators)
    const primaryResult = await _saveContractAndSov(
      pid, contractValue, fromRole, creatorOrgId || null,
      isTC ? 'General Contractor' : null,
      isTC ? 'GC → TC SOV' : 'Framing SOV',
      scopeData, answers,
    );

    // If TC, also create downstream FC contract + SOV
    let fcResult: { contractId: string; sovId: string } | null = null;
    if (isTC && fcContractValue > 0) {
      fcResult = await _saveContractAndSov(
        pid, fcContractValue, fromRole, creatorOrgId || null,
        'Field Crew',
        'TC → FC SOV',
        scopeData, answers,
      );
    }

    return { contractId: primaryResult.contractId, sovId: primaryResult.sovId, fcResult };
  }, [buildingType, answers, _saveContractAndSov]);

  // Legacy save: uses the projectId passed to the hook
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No projectId provided');
      await _saveToDb(projectId);
    },
    onError: (error) => {
      console.error('[SetupWizardV2] Save error:', error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup_answers', projectId] });
      qc.invalidateQueries({ queryKey: ['setup_answers_count', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['project_basic', projectId] });
      qc.invalidateQueries({ queryKey: ['project_contracts', projectId] });
      qc.invalidateQueries({ queryKey: ['project_sov', projectId] });
      qc.invalidateQueries({ queryKey: ['contract_sov', projectId] });
      qc.invalidateQueries({ queryKey: ['project_sovs_lock_check', projectId] });
    },
  });

  // Standalone save: accepts an explicit projectId (for use in unified create flow)
  const saveAll = useCallback(async (pid: string, creatorOrgId?: string, creatorOrgType?: string) => {
    const result = await _saveToDb(pid, creatorOrgId, creatorOrgType);
    qc.invalidateQueries({ queryKey: ['setup_answers', pid] });
    qc.invalidateQueries({ queryKey: ['setup_answers_count', pid] });
    qc.invalidateQueries({ queryKey: ['project', pid] });
    qc.invalidateQueries({ queryKey: ['project_basic', pid] });
    qc.invalidateQueries({ queryKey: ['project_contracts', pid] });
    qc.invalidateQueries({ queryKey: ['project_sov', pid] });
    qc.invalidateQueries({ queryKey: ['contract_sov', pid] });
    qc.invalidateQueries({ queryKey: ['project_sovs_lock_check', pid] });
    return result;
  }, [_saveToDb, qc]);

  return {
    buildingType,
    selectBuildingType,
    answers,
    setAnswer,
    visibleQuestions,
    sovLines,
    save: saveMutation.mutateAsync,
    saveAll,
    isSaving: saveMutation.isPending,
  };
}
