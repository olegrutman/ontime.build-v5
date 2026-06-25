import type { COReasonCode, COPricingType, COCreatedByRole } from '@/types/changeOrder';
import type { LocationType } from './catalog';
import { LOCATION_SYSTEMS } from './catalog';

// ─── Cause / Inference ───────────────────────────────────────────
export type CauseGroup = 'conflict' | 'site_issue' | 'addon';

export interface CauseOption {
  id: string;
  group: CauseGroup;
  icon: string;
  label: string;
  sub: string;
  docType: 'CO' | 'WO';
  billable: 'yes' | 'maybe' | 'no';
  suggested?: boolean;
  reason: COReasonCode;
  /** Optional system allowlist. When omitted, the cause applies to all systems. */
  allowedSystems?: string[];
}

/** System allowlist per cause id. Causes not listed apply to all systems. */
export const CAUSE_SYSTEM_RULES: Record<string, string[]> = {
  mech: ['floor', 'wall', 'ceiling', 'roof'],
  plumb: ['floor', 'wall', 'ceiling'],
  elec: ['floor', 'wall', 'ceiling'],
  frame: ['floor', 'wall', 'roof', 'ceiling', 'deck', 'stair', 'openings'],
};

export function isCauseAllowedForSystem(causeId: string | null, systemId: string | null): boolean {
  if (!causeId) return true;
  const allowed = CAUSE_SYSTEM_RULES[causeId];
  if (!allowed) return true;
  if (!systemId) return true;
  return allowed.includes(systemId);
}

// ─── System ──────────────────────────────────────────────────────
export interface SystemOption {
  id: string;
  icon: string;
  label: string;
  sub: string;
}

// ─── Work Types ──────────────────────────────────────────────────
export interface WorkTypeOption {
  id: string;
  label: string;
  meta: string;
  suggested?: boolean;
  section?: string;
}

// ─── Per-Item State ──────────────────────────────────────────────
export interface PickerItem {
  // Step 1: Location (catalog-driven)
  locations: string[];
  /** LocationType per selected location, parallel to `locations` — drives the System step's allowed set. */
  locationTypes: LocationType[];
  multiLocation: boolean;

  // Step 2: System (catalog id from SYSTEMS)
  system: string | null;
  systemName: string | null;

  // Step 3: Scope — catalog scope ids stored in workTypes for back-compat
  workTypes: Set<string>;
  workNames: Record<string, string>;

  // Step 4: Cause
  causeId: string | null;
  causeName: string | null;
  docType: 'CO' | 'WO';
  billable: 'yes' | 'maybe' | 'no';
  reason: COReasonCode | null;

  // Step 5: Routing & Responsibilities
  pricingType: COPricingType;
  pricingName: string;

  // Scope narrative (auto-built from catalog selections)
  narrative: string;
  tone: 'plain';

  // Needs flags (pricing deferred to detail page)
  materialsNeeded: boolean;
  equipmentNeeded: boolean;
  materialResponsible: 'GC' | 'TC';
  equipmentResponsible: 'GC' | 'TC';
}

// ─── Collaboration State (shared across all items) ───────────────
export interface CollaborationState {
  assignedTcOrgId: string | null;
  requestFcInput: boolean;
  assignedFcOrgId: string | null;
}

// ─── Top-Level Picker State ──────────────────────────────────────
export interface PickerState {
  step: number;
  currentItemIndex: number;
  items: PickerItem[];
  collaboration: CollaborationState;
  role: COCreatedByRole;
  submitted: boolean;
  linkedRfiId: string | null;
}

// ─── Reducer Actions ─────────────────────────────────────────────
export type PickerAction =
  | { type: 'SET_STEP'; step: number }
  | { type: 'SET_ROLE'; role: COCreatedByRole }
  | { type: 'SET_LOCATION'; locations: string[]; locationTypes: LocationType[] }
  | { type: 'TOGGLE_MULTI_LOCATION' }
  | { type: 'SET_SYSTEM'; systemId: string; systemName: string }
  | { type: 'SET_SYSTEM_KEEP_ITEMS'; systemId: string; systemName: string }
  | { type: 'SET_CAUSE'; causeId: string; causeName: string; docType: 'CO' | 'WO'; billable: 'yes' | 'maybe' | 'no'; reason: COReasonCode }
  | { type: 'SET_PRICING'; pricingType: COPricingType; pricingName: string }
  | { type: 'TOGGLE_WORK_TYPE'; workTypeId: string; workTypeName: string }
  | { type: 'SET_NARRATIVE'; narrative: string }
  | { type: 'SET_TONE'; tone: 'plain' }
  | { type: 'SET_MATERIALS_NEEDED'; value: boolean }
  | { type: 'SET_EQUIPMENT_NEEDED'; value: boolean }
  | { type: 'SET_MATERIAL_RESPONSIBLE'; value: 'GC' | 'TC' }
  | { type: 'SET_EQUIPMENT_RESPONSIBLE'; value: 'GC' | 'TC' }
  | { type: 'SET_ASSIGNED_TC'; orgId: string | null }
  | { type: 'SET_REQUEST_FC'; value: boolean }
  | { type: 'SET_ASSIGNED_FC'; orgId: string | null }
  | { type: 'ADD_ITEM' }
  | { type: 'SWITCH_ITEM'; index: number }
  | { type: 'DELETE_ITEM'; index: number }
  | { type: 'SET_SUBMITTED' }
  | { type: 'SET_LINKED_RFI'; rfiId: string | null };

// ─── Step Definitions ────────────────────────────────────────────
// Catalog-driven cascade: Location → System → Scope are funnelled so
// users can't pick real-world impossible combos. Cause + Routing follow.
export const PICKER_STEPS = [
  { key: 'location', label: 'Location', num: 1 },
  { key: 'system',   label: 'System',   num: 2 },
  { key: 'scope',    label: 'Scope',    num: 3 },
  { key: 'cause',    label: 'Cause',    num: 4 },
  { key: 'routing',  label: 'Routing',  num: 5 },
  { key: 'review',   label: 'Review',   num: 6 },
] as const;

export const REVIEW_STEP = PICKER_STEPS[PICKER_STEPS.length - 1].num;

/** Union of systems allowed for the user's selected location types. */
export function allowedSystemIdsForItem(item: PickerItem): Set<string> {
  const out = new Set<string>();
  for (const t of item.locationTypes) {
    for (const s of LOCATION_SYSTEMS[t] ?? []) out.add(s);
  }
  return out;
}

// ─── Helpers ─────────────────────────────────────────────────────
export function blankItem(): PickerItem {
  return {
    locations: [],
    locationTypes: [],
    multiLocation: false,
    system: null,
    systemName: null,
    causeId: null,
    causeName: null,
    docType: 'CO',
    billable: 'yes',
    reason: null,
    pricingType: 'fixed',
    pricingName: 'Fixed Price',
    workTypes: new Set(),
    workNames: {},
    narrative: '',
    tone: 'plain',
    materialsNeeded: false,
    equipmentNeeded: false,
    materialResponsible: 'TC',
    equipmentResponsible: 'TC',
  };
}

export function initialPickerState(role: COCreatedByRole): PickerState {
  return {
    step: 1,
    currentItemIndex: 0,
    items: [blankItem()],
    collaboration: {
      assignedTcOrgId: null,
      requestFcInput: false,
      assignedFcOrgId: null,
    },
    role,
    submitted: false,
    linkedRfiId: null,
  };
}

export function locationDisplay(item: PickerItem): string {
  if (!item.locations.length) return '—';
  if (item.locations.length === 1) return item.locations[0];
  return item.locations.join(', ');
}

export function locationShort(item: PickerItem): string {
  if (!item.locations.length) return 'No location';
  if (item.locations.length === 1) return item.locations[0];
  return `${item.locations.length} locations`;
}
