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
  status: 'draft';
  conditionalKey: string | null;
}

export type Answers = Record<string, any>;

/* ══════════════════════════════════════════════════════════════════════
   QUESTION DEFINITIONS
   ══════════════════════════════════════════════════════════════════════ */

// Shared questions (all building types)
const SHARED_QUESTIONS: WizardQuestion[] = [
  {
    id: 'S1',
    phase: 'per_floor',
    label: 'Material responsibility',
    inputType: 'dropdown',
    options: ['Labor only', 'Furnish & install', 'Split'],
    tag: 'always',
    fieldKey: 'material_responsibility',
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

  // ─── BASEMENT ──────────────────────────────────────────────────
  {
    id: 'Q2_basement',
    phase: 'per_floor',
    label: 'Has basement?',
    inputType: 'yes_no',
    tag: 'conditional',
    fieldKey: 'has_basement',
    buildingTypes: ['apartments_mf', 'hotel', 'senior_living'],
  },

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

  // ─── ROOF SHEATHING ───────────────────────────────────────────
  {
    id: 'Q7_roof',
    phase: 'roof',
    label: 'Roof sheathing in scope?',
    inputType: 'yes_no',
    tag: 'always',
    fieldKey: 'roof_sheathing',
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
    phase: 'exterior_finish',
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

export function generateSOVLines(bt: BuildingType, answers: Answers): SOVLine[] {
  const lines: SOVLine[] = [];
  let n = 0;
  const push = (phase: SOVPhase, desc: string, key: string | null = null) => {
    lines.push({ lineNumber: ++n, description: desc, phase, amount: 0, status: 'draft', conditionalKey: key });
  };

  const a = answers;
  const floorSystem = a.floor_system || 'TJI I-joists';

  // Determine story count
  let storyCount = 1;
  if (typeof a.stories === 'number') storyCount = Math.max(1, a.stories);
  else if (a.stories === '2-story' || a.stories === '2') storyCount = 2;
  else if (a.stories === '3') storyCount = 3;
  else if (a.stories === 'Mix of both') storyCount = 2; // generate both plans
  else if (a.stories === '1-story') storyCount = 1;

  // ─── Phase 1: Mobilization & Steel ──────────────────────────
  if (a.mobilization === 'yes' || (typeof a.mobilization === 'object' && a.mobilization?.enabled)) {
    const pct = typeof a.mobilization === 'object' ? a.mobilization.percent : '';
    push('mobilization_steel', `Mobilization${pct ? ` (${pct}% of contract)` : ''}`, 'mobilization');
  }

  if (a.structural_steel === 'yes' || (typeof a.structural_steel === 'object' && a.structural_steel?.enabled)) {
    const floors: string[] = (typeof a.structural_steel === 'object' && Array.isArray(a.structural_steel?.floors))
      ? a.structural_steel.floors
      : ['L1'];
    for (const f of floors) {
      push('mobilization_steel', `Structural steel — ${f}`, 'structural_steel');
    }
  }

  // Basement level
  if (a.has_basement === 'yes') {
    push('per_floor', 'Structural steel & post bases — Basement', 'has_basement');
    push('per_floor', `Floor system (${floorSystem}) — Basement`, 'has_basement');
    push('per_floor', 'Wall framing — Basement', 'has_basement');
    push('per_floor', 'Hardware & connectors — Basement', 'has_basement');
  }

  // ─── Phase 2: Per-Floor Structural ──────────────────────────
  for (let i = 1; i <= storyCount; i++) {
    const label = `L${i}`;
    push('per_floor', `Floor system (${floorSystem}) — ${label}`);
    push('per_floor', `Floor sheathing — ${label}`);
    push('per_floor', `Wall framing — ${label}`);
    push('per_floor', `Hardware & connectors — ${label}`);

    if (a.has_elevator === 'yes') {
      push('per_floor', `Elevator hoistway framing — ${label}`, 'has_elevator');
    }
    if ((a.stair_towers ?? 0) > 0) {
      push('per_floor', `Stair tower framing — ${label} (×${a.stair_towers})`, 'stair_towers');
    }
    if (i === 1 && (a.has_garage === 'yes' || (a.garage_type && a.garage_type !== 'No garage'))) {
      const gType = a.garage_type || (typeof a.has_garage === 'object' ? a.has_garage.subtype : 'Attached');
      push('per_floor', `Garage framing — ${gType || 'Attached'}`, 'has_garage');
      if (bt === 'townhome') {
        push('per_floor', 'Fire wall framing', 'has_garage');
        push('per_floor', 'OH door bucks', 'has_garage');
      }
    }
  }

  // ─── Phase 3: Roof ──────────────────────────────────────────
  push('roof', 'Roof framing');
  if (a.roof_sheathing === 'yes') {
    push('roof', 'Roof sheathing', 'roof_sheathing');
  }

  // ─── Phase 4: Envelope ──────────────────────────────────────
  push('envelope', 'WRB (weather-resistive barrier)');
  if (a.windows_in_scope === 'yes') {
    const mode = a.window_install_mode || 'Install only';
    push('envelope', `Windows & doors — ${mode}`, 'windows_in_scope');
  }

  // ─── Phase 5: Backout & Interior ────────────────────────────
  push('backout', 'MEP backout');
  push('backout', 'Blocking');
  push('backout', 'Fire blocking');
  push('backout', 'Shim & shave');

  if (bt === 'senior_living') {
    const adaScope = a.ada_blocking || 'Standard package';
    push('backout', `ADA blocking — ${adaScope}`, 'ada_blocking');
  }

  // ─── Phase 6: Exterior Finish ───────────────────────────────
  if (a.siding_in_scope === 'yes') {
    if (a.siding_coverage === 'Per elevation (Front · Left · Right · Rear)') {
      for (const elev of ['Front', 'Left', 'Right', 'Rear']) {
        push('exterior_finish', `Siding — ${elev} elevation`, 'siding_in_scope');
      }
    } else {
      push('exterior_finish', 'Siding — whole building', 'siding_in_scope');
    }
  }

  push('exterior_finish', 'Fascia & soffit');
  push('exterior_finish', 'Trim');

  if (a.has_balcony === 'yes') {
    const deckLabel = bt === 'senior_living' ? 'Porch / screened entry framing'
      : bt === 'track_home' ? 'Porch / entry framing'
      : bt === 'apartments_mf' || bt === 'hotel' ? 'Balcony framing'
      : 'Balcony / deck / porch framing';
    push('exterior_finish', deckLabel, 'has_balcony');

    if (a.decking_in_scope === 'yes') {
      const mat = a.decking_material || 'Composite (Trex)';
      push('exterior_finish', `Decking finish — ${mat}`, 'decking_in_scope');
    }
  }

  if (a.has_rooftop_deck === 'yes') {
    push('exterior_finish', 'Rooftop deck framing', 'has_rooftop_deck');
    if (a.rooftop_decking_in_scope === 'yes') {
      push('exterior_finish', 'Rooftop decking finish', 'rooftop_decking_in_scope');
    }
  }

  if (a.has_decorative === 'yes') {
    push('exterior_finish', 'Decorative exterior (columns, corbels, shutters)', 'has_decorative');
  }

  if (a.has_covered_entry === 'yes') {
    push('exterior_finish', 'Covered entry framing', 'has_covered_entry');
  }

  if (a.has_porte_cochere === 'yes') {
    push('exterior_finish', 'Porte-cochère / entry canopy framing', 'has_porte_cochere');
  }

  if (a.has_pool_deck === 'yes') {
    push('exterior_finish', 'Pool deck / amenity framing', 'has_pool_deck');
  }

  if (a.has_breezeways === 'yes') {
    push('exterior_finish', 'Breezeway / open corridor framing', 'has_breezeways');
  }

  if (a.has_amenity_building === 'yes') {
    push('exterior_finish', 'Amenity / clubhouse building framing', 'has_amenity_building');
  }

  // ─── Phase 7: Closeout ──────────────────────────────────────
  push('closeout', 'Frame walk');
  push('closeout', 'Nail sweep');
  push('closeout', 'Final punch');

  return lines;
}

/* ══════════════════════════════════════════════════════════════════════
   WIZARD PROGRESS PHASES (for progress bar)
   ══════════════════════════════════════════════════════════════════════ */

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

export function useSetupWizardV2(projectId: string) {
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

  // Save all answers + SOV to database
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!buildingType) throw new Error('No building type selected');

      // Save answers
      const answerRows = Object.entries(answers).map(([field_key, value]) => ({
        project_id: projectId,
        field_key,
        value,
        updated_at: new Date().toISOString(),
      }));

      // Also save building_type
      answerRows.push({
        project_id: projectId,
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
      await supabase
        .from('projects')
        .update({ project_type: buildingType })
        .eq('id', projectId);

      // Save scope_selections as a JSON blob answer
      const scopeData = { building_type: buildingType, ...answers };
      await supabase
        .from('project_setup_answers')
        .upsert({
          project_id: projectId,
          field_key: 'scope_selections_v2',
          value: scopeData,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'project_id,field_key' });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['setup_answers', projectId] });
      qc.invalidateQueries({ queryKey: ['setup_answers_count', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      qc.invalidateQueries({ queryKey: ['project_basic', projectId] });
    },
  });

  return {
    buildingType,
    selectBuildingType,
    answers,
    setAnswer,
    visibleQuestions,
    sovLines,
    save: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
