import type { Zone } from '@/types/catalog';

export type BuildingType =
  | 'custom_home' | 'track_home'
  | 'townhomes'
  | 'apartments_mf' | 'hotel_hospitality' | 'senior_living'
  | 'commercial'
  | 'exterior';  // virtual — envelope-only work regardless of home_type

export type FlowScenario = 'damage' | 'addition' | 'rework';

/**
 * WorkIntent — the single user choice that drives Sasha's question flow.
 * Each intent maps 1:1 to a purpose-built question tree in `intentFlows.ts`.
 * This replaces the broken (reason × workType → addition default) lookup.
 */
export type WorkIntent =
  | 'repair_damage'        // Plumber cut a joist; weather damage
  | 'add_new'              // Build a closet, add a wall
  | 'modify_existing'      // Move a window, enlarge an opening
  | 'redo_work'            // Wall framed crooked; rework
  | 'tear_out'             // Selective demo, cabinet pull
  | 'envelope_work'        // WRB, flashing, sheathing, siding prep
  | 'structural_install'   // Beam, post, hold-down, shear wall
  | 'mep_blocking'         // TV mount blocking, grab bar backing
  | 'inspection_fix'       // Backout, code correction, punch list
  | 'other';               // Free-text fallback

export const WORK_INTENT_LABELS: Record<WorkIntent, string> = {
  repair_damage:      'Fix damage',
  add_new:            'Add new',
  modify_existing:    'Modify existing',
  redo_work:          'Redo work',
  tear_out:           'Tear out / demo',
  envelope_work:      'Envelope / WRB',
  structural_install: 'Structural install',
  mep_blocking:       'Blocking / backing',
  inspection_fix:     'Inspector / punch fix',
  other:              'Other',
};

export const WORK_INTENT_DESCRIPTIONS: Record<WorkIntent, string> = {
  repair_damage:      'Something got damaged — fix it',
  add_new:            'New scope not in the original plan',
  modify_existing:    'Change something already built',
  redo_work:          'Something built wrong — redo it',
  tear_out:           'Demolish or remove existing work',
  envelope_work:      'Exterior, WRB, flashing, sheathing',
  structural_install: 'Beams, posts, hold-downs, shear walls',
  mep_blocking:       'Blocking or backing for another trade',
  inspection_fix:     'Inspector callback or punch-list item',
  other:              "Doesn't fit — let me describe it",
};

export const WORK_INTENT_ICONS: Record<WorkIntent, string> = {
  repair_damage:      '🔧',
  add_new:            '➕',
  modify_existing:    '↔️',
  redo_work:          '🔄',
  tear_out:           '🔨',
  envelope_work:      '🛡️',
  structural_install: '⚙️',
  mep_blocking:       '🧱',
  inspection_fix:     '✅',
  other:              '📝',
};

export interface ScopeAnswer {
  id: string;
  label: string;
  icon?: string;
  sub?: string;
  spec?: boolean;  // building-type-specific — render with purple dot highlight
}

export interface ScopeQuestion {
  id: string;
  text: string;
  hint?: string;
  grid?: 'cols-3' | 'cols-4' | 'cols-5' | 'cols-6' | 'scale' | 'multiselect';
  answers: ScopeAnswer[];
  /** Optional context-aware answer resolver. When present, the renderer should
   *  use this instead of the static `answers` array. Lets a single question
   *  ("What member was damaged?") show a roof-specific list when ctx.zone === 'roof',
   *  a wall-specific list when ctx.zone === 'interior_wall', etc. */
  answersFor?: (ctx: FlowContext) => ScopeAnswer[];
  /** Optional context-aware question text. Same idea as `answersFor`. */
  textFor?: (ctx: FlowContext) => string;
  /** Optional visibility predicate. When false, the question is skipped
   *  entirely by `useQuestionFlow` (no answer required, not shown). */
  showFor?: (ctx: FlowContext) => boolean;
  annotation?: string;
  why?: string;
}

export interface FlowContext {
  buildingType: BuildingType;
  framingMethod: string | null;
  constructionType: string | null;
  stories: number | null;
  hasSharedWalls: boolean;
  locationTag: string;
  zone: Zone | null;
  reason: string;
  workType: string | null;
  projectName: string;
}

export interface ScopeFlow {
  title: string;
  sub: string;
  questions: ScopeQuestion[];
  summarize: (ctx: FlowContext, answers: Record<string, string | string[]>) => string;
}
