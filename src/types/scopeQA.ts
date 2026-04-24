import type { Zone } from '@/lib/resolveZone';

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
