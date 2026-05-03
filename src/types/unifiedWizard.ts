// Unified Change Order Wizard Types

import type { CatalogItem } from './quickLog';
import type { LocationData } from './location';
export type CostResponsibility = 'GC' | 'TC';

// ─── Enums ───────────────────────────────────────────────────────

export type WOMode = 'quick_capture' | 'full_scope';
export type WORequestType = 'request' | 'log';
export type WOLineItemStatus = 'draft' | 'submitted' | 'approved' | 'disputed' | 'invoiced';
export type WOLaborMode = 'hourly' | 'lump_sum';
export type WOMaterialUnit = 'ea' | 'LF' | 'SF' | 'bag' | 'box' | 'sheet' | 'roll' | 'gal';

// ─── Line Items ──────────────────────────────────────────────────

export interface WOLineItem {
  id: string;
  project_id: string;
  change_order_id: string | null;
  org_id: string;
  created_by_user_id: string;
  catalog_item_id: string | null;
  item_name: string;
  division: string | null;
  category_name: string | null;
  group_label: string | null;
  unit: string;
  qty: number | null;
  hours: number | null;
  unit_rate: number;
  line_total: number;
  material_spec: string | null;
  location_tag: string | null;
  note: string | null;
  period_week: string;
  status: WOLineItemStatus;
  added_at: string;
}

// ─── Materials ───────────────────────────────────────────────────

export interface WOMaterialRow {
  id: string;
  project_id: string;
  change_order_id: string | null;
  org_id: string;
  created_by_user_id: string;
  description: string;
  supplier: string | null;
  quantity: number;
  unit: string;
  unit_cost: number;
  line_cost: number;
  markup_percent: number;
  markup_amount: number;
  billed_amount: number;
  added_by_role: string;
  receipt_note: string | null;
  status: WOLineItemStatus;
  added_at: string;
}

// ─── Equipment ───────────────────────────────────────────────────

export interface WOEquipmentRow {
  id: string;
  project_id: string;
  change_order_id: string | null;
  org_id: string;
  created_by_user_id: string;
  description: string;
  duration_note: string | null;
  cost: number;
  markup_percent: number;
  markup_amount: number;
  billed_amount: number;
  added_by_role: string;
  notes: string | null;
  status: WOLineItemStatus;
  added_at: string;
}

// ─── Financials (computed, not persisted) ────────────────────────

export interface WOFinancials {
  laborTotal: number;
  materialsLineCost: number;
  materialsMarkup: number;
  materialsBilled: number;
  equipmentCost: number;
  equipmentMarkup: number;
  equipmentBilled: number;
  totalBilledToGC: number;
  tcTotalCost: number;
  runningMarginPct: number; // (billed - cost) / billed * 100
}

// ─── Wizard State ────────────────────────────────────────────────

export interface UnifiedWizardData {
  // Step 0 — Intent (TC only)
  wo_request_type: WORequestType | null;

  // Step 1 — Capture mode
  wo_mode: WOMode | null;

  // Step 2 — Scope
  title: string;
  description: string;
  selectedCatalogItems: CatalogItem[];

  // Step 3 — Location
  location_tags: string[];

  // Step 4 — Labor
  labor_mode: WOLaborMode;
  hourly_rate: number | null;
  hours: number | null;
  lump_sum_amount: number | null;
  use_fc_hours_at_tc_rate: boolean;

  // Step 5 — Materials (local rows before save)
  materials: WOMaterialRowDraft[];
  materials_markup_pct: number;

  // Step 6 — Equipment (local rows before save)
  equipment: WOEquipmentRowDraft[];
  equipment_markup_pct: number;
}

// Draft rows (before persisted, no id yet)
export interface WOMaterialRowDraft {
  tempId: string;
  description: string;
  supplier: string;
  quantity: number;
  unit: WOMaterialUnit;
  unit_cost: number;
  markup_percent: number;
}

export interface WOEquipmentRowDraft {
  tempId: string;
  description: string;
  duration_note: string;
  cost: number;
  markup_percent: number;
}

export const INITIAL_UNIFIED_WIZARD_DATA: UnifiedWizardData = {
  wo_request_type: null,
  wo_mode: null,
  title: '',
  description: '',
  selectedCatalogItems: [],
  location_tags: [],
  labor_mode: 'hourly',
  hourly_rate: null,
  hours: null,
  lump_sum_amount: null,
  use_fc_hours_at_tc_rate: false,
  materials: [],
  materials_markup_pct: 0,
  equipment: [],
  equipment_markup_pct: 0,
};

// ─── Wizard Steps ────────────────────────────────────────────────

export interface WizardStepDef {
  key: string;
  title: string;
  description: string;
}

export const ALL_WIZARD_STEPS: WizardStepDef[] = [
  { key: 'mode', title: 'Capture Mode', description: 'How do you want to build this change order?' },
  { key: 'scope', title: 'Scope of Work', description: 'Select tasks from the catalog' },
  { key: 'location', title: 'Location', description: 'Where will this work be performed?' },
  { key: 'labor', title: 'Labor', description: 'Set your rate and log hours' },
  { key: 'materials', title: 'Materials', description: 'Add material costs' },
  { key: 'equipment', title: 'Equipment', description: 'Add equipment costs' },
  { key: 'review', title: 'Review & Submit', description: 'Review your change order before submitting' },
];

// ─── Material unit options ───────────────────────────────────────

export const MATERIAL_UNIT_OPTIONS: { value: WOMaterialUnit; label: string }[] = [
  { value: 'ea', label: 'ea' },
  { value: 'LF', label: 'LF' },
  { value: 'SF', label: 'SF' },
  { value: 'bag', label: 'bag' },
  { value: 'box', label: 'box' },
  { value: 'sheet', label: 'sheet' },
  { value: 'roll', label: 'roll' },
  { value: 'gal', label: 'gal' },
];

// ─── Status labels ───────────────────────────────────────────────

export const WO_LINE_ITEM_STATUS_LABELS: Record<WOLineItemStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  approved: 'Approved',
  disputed: 'Disputed',
  invoiced: 'Invoiced',
};
