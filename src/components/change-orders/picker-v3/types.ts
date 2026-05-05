import type { COReasonCode, COPricingType, COCreatedByRole } from '@/types/changeOrder';

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
  // Step 1: Where
  locations: string[];
  multiLocation: boolean;
  system: string | null;
  systemName: string | null;

  // Step 2: Why
  causeId: string | null;
  causeName: string | null;
  docType: 'CO' | 'WO';
  billable: 'yes' | 'maybe' | 'no';
  reason: COReasonCode | null;

  // Step 3: Routing & Responsibilities
  pricingType: COPricingType;
  pricingName: string;

  // Step 2: Work types
  workTypes: Set<string>;
  workNames: Record<string, string>;

  // Step 2: Scope narrative
  narrative: string;
  tone: 'plain';

  // Step 3: Needs flags (not itemized — pricing deferred to detail page)
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
  | { type: 'SET_LOCATION'; locations: string[] }
  | { type: 'TOGGLE_MULTI_LOCATION' }
  | { type: 'SET_SYSTEM'; systemId: string; systemName: string }
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
export const PICKER_STEPS = [
  { key: 'where-why', label: 'Where & Why', num: 1 },
  { key: 'scope', label: 'Scope', num: 2 },
  { key: 'routing', label: 'Routing', num: 3 },
  { key: 'review', label: 'Review', num: 4 },
] as const;

// ─── Helpers ─────────────────────────────────────────────────────
export function blankItem(): PickerItem {
  return {
    locations: [],
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
