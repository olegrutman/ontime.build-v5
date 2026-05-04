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

// ─── Material / Equipment Draft ──────────────────────────────────
export interface MaterialDraft {
  tempId: string;
  description: string;
  sku: string;
  supplier: string;
  quantity: number;
  unit: string;
  unitCost: number;
  icon: string;
}

export interface EquipmentDraft {
  tempId: string;
  description: string;
  supplier: string;
  durationNote: string;
  cost: number;
  icon: string;
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

  // Step 3: Who (shared across items)
  // (stored at top-level state)

  // Step 4: Pricing
  pricingType: COPricingType;
  pricingName: string;

  // Step 5: Work types
  workTypes: Set<string>;
  workNames: Record<string, string>;

  // Step 6: Scope narrative
  narrative: string;
  tone: 'plain';

  // Step 7: Materials & Equipment
  materials: MaterialDraft[];
  equipment: EquipmentDraft[];
  materialResponsible: 'GC' | 'TC';
  equipmentResponsible: 'GC' | 'TC';

  // Step 8: Total
  markup: number;

  // Computed labor (simplified for v3)
  laborEntries: Array<{
    role: string;
    rate: number;
    hours: number;
  }>;
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
  | { type: 'SET_MARKUP'; markup: number }
  | { type: 'SET_LABOR_HOURS'; index: number; hours: number }
  | { type: 'ADD_MATERIAL'; material: MaterialDraft }
  | { type: 'REMOVE_MATERIAL'; tempId: string }
  | { type: 'ADD_EQUIPMENT'; equipment: EquipmentDraft }
  | { type: 'REMOVE_EQUIPMENT'; tempId: string }
  | { type: 'SET_MATERIAL_RESPONSIBLE'; value: 'GC' | 'TC' }
  | { type: 'SET_EQUIPMENT_RESPONSIBLE'; value: 'GC' | 'TC' }
  | { type: 'SET_ASSIGNED_TC'; orgId: string | null }
  | { type: 'SET_REQUEST_FC'; value: boolean }
  | { type: 'SET_ASSIGNED_FC'; orgId: string | null }
  | { type: 'ADD_ITEM' }
  | { type: 'SWITCH_ITEM'; index: number }
  | { type: 'DELETE_ITEM'; index: number }
  | { type: 'SET_SUBMITTED' };

// ─── Step Definitions ────────────────────────────────────────────
export const PICKER_STEPS = [
  { key: 'where', label: 'Where', num: 1 },
  { key: 'why', label: 'Why', num: 2 },
  { key: 'who', label: 'Who', num: 3 },
  { key: 'pricing', label: 'Pricing', num: 4 },
  { key: 'work', label: 'Work', num: 5 },
  { key: 'scope', label: 'Scope', num: 6 },
  { key: 'materials', label: 'Materials', num: 7 },
  { key: 'total', label: 'Total', num: 8 },
  { key: 'review', label: 'Review', num: 9 },
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
    materials: [],
    equipment: [],
    materialResponsible: 'TC',
    equipmentResponsible: 'TC',
    markup: 18,
    laborEntries: [
      { role: 'Lead Carpenter', rate: 72, hours: 0 },
      { role: 'Carpenter', rate: 60, hours: 0 },
    ],
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
  };
}

export function itemLaborTotal(item: PickerItem): number {
  return item.laborEntries.reduce((s, e) => s + e.rate * e.hours, 0);
}

export function itemMaterialTotal(item: PickerItem): number {
  return item.materials.reduce((s, m) => s + m.unitCost * m.quantity, 0);
}

export function itemEquipmentTotal(item: PickerItem): number {
  return item.equipment.reduce((s, e) => s + e.cost, 0);
}

export function itemSubtotal(item: PickerItem): number {
  const base = itemLaborTotal(item) + itemMaterialTotal(item) + itemEquipmentTotal(item);
  const mult = item.multiLocation && item.locations.length > 1 ? item.locations.length : 1;
  return base * mult * (1 + item.markup / 100);
}

export function grandTotal(items: PickerItem[]): number {
  return items.reduce((s, it) => s + itemSubtotal(it), 0);
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
