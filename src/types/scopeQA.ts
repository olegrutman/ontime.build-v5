import type { Zone } from '@/types/catalog';

export type BuildingType =
  | 'custom_home' | 'track_home'
  | 'townhomes'
  | 'apartments_mf' | 'hotel_hospitality' | 'senior_living'
  | 'commercial'
  | 'exterior';  // virtual — envelope-only work regardless of home_type

export type FlowScenario = 'damage' | 'addition' | 'rework';


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
