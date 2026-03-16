// Work Order Wizard Types — unified across GC, TC, FC roles

import type { CatalogItem } from './quickLog';

// ─── Enums ───────────────────────────────────────────────────────

export type WOMode = 'quick_capture' | 'full_scope';
export type WORequestType = 'request' | 'log';
export type WOLaborMode = 'hourly' | 'lump_sum';
export type WOMaterialUnit = 'ea' | 'LF' | 'SF' | 'bag' | 'box' | 'sheet' | 'roll' | 'gal';

// ─── Draft row types (before persisted) ─────────────────────────

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

// ─── Wizard State ────────────────────────────────────────────────

export interface WorkOrderWizardData {
  // Step 0 — Intent (TC only)
  wo_request_type: WORequestType | null;

  // Step 1 — Mode
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

  // Step 5 — Materials
  materials: WOMaterialRowDraft[];
  materials_markup_pct: number;

  // Step 6 — Equipment
  equipment: WOEquipmentRowDraft[];
  equipment_markup_pct: number;

  // Step 7 — Assign
  assigned_org_id: string | null;
  participant_org_ids: string[];
  request_fc_input: boolean;
  selected_fc_org_id: string | null;

  // Step 8 — Review (Quick Capture selective submit)
  submit_item_ids: string[];
}

export const INITIAL_WIZARD_DATA: WorkOrderWizardData = {
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
  assigned_org_id: null,
  participant_org_ids: [],
  request_fc_input: false,
  selected_fc_org_id: null,
  submit_item_ids: [],
};

// ─── Wizard Steps ────────────────────────────────────────────────

export interface WizardStepDef {
  key: string;
  title: string;
  description: string;
}

export const ALL_WIZARD_STEPS: WizardStepDef[] = [
  { key: 'intent', title: 'Intent', description: 'What kind of work order is this?' },
  { key: 'mode', title: 'Capture Mode', description: 'How do you want to build this work order?' },
  { key: 'scope', title: 'Scope of Work', description: 'Select tasks from the catalog' },
  { key: 'location', title: 'Location', description: 'Where will this work be performed?' },
  { key: 'labor', title: 'Labor', description: 'Set your rate and log hours' },
  { key: 'materials', title: 'Materials', description: 'Add material costs' },
  { key: 'equipment', title: 'Equipment', description: 'Add equipment costs' },
  { key: 'assign', title: 'Assign', description: 'Send to team members' },
  { key: 'review', title: 'Review & Submit', description: 'Review your work order before submitting' },
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

// ─── Equipment catalog (flat list) ──────────────────────────────

export interface EquipmentCatalogItem {
  id: string;
  name: string;
  category: string;
}

export const EQUIPMENT_CATALOG: EquipmentCatalogItem[] = [
  // Heavy Equipment
  { id: 'he-1', name: 'Excavator', category: 'Heavy Equipment' },
  { id: 'he-2', name: 'Backhoe', category: 'Heavy Equipment' },
  { id: 'he-3', name: 'Skid Steer', category: 'Heavy Equipment' },
  { id: 'he-4', name: 'Mini Excavator', category: 'Heavy Equipment' },
  { id: 'he-5', name: 'Boom Lift', category: 'Heavy Equipment' },
  { id: 'he-6', name: 'Scissor Lift', category: 'Heavy Equipment' },
  { id: 'he-7', name: 'Forklift', category: 'Heavy Equipment' },
  // Power Tools
  { id: 'pt-1', name: 'Concrete Saw', category: 'Power Tools' },
  { id: 'pt-2', name: 'Demolition Hammer', category: 'Power Tools' },
  { id: 'pt-3', name: 'Rotary Hammer Drill', category: 'Power Tools' },
  { id: 'pt-4', name: 'Plate Compactor', category: 'Power Tools' },
  { id: 'pt-5', name: 'Power Washer', category: 'Power Tools' },
  { id: 'pt-6', name: 'Generator (portable)', category: 'Power Tools' },
  { id: 'pt-7', name: 'Air Compressor', category: 'Power Tools' },
  { id: 'pt-8', name: 'Welder', category: 'Power Tools' },
  // Scaffolding & Access
  { id: 'sa-1', name: 'Scaffolding (per section)', category: 'Scaffolding & Access' },
  { id: 'sa-2', name: 'Baker Scaffold', category: 'Scaffolding & Access' },
  { id: 'sa-3', name: 'Extension Ladder (32ft+)', category: 'Scaffolding & Access' },
  { id: 'sa-4', name: 'Step Ladder (12ft)', category: 'Scaffolding & Access' },
  { id: 'sa-5', name: 'Pump Jack System', category: 'Scaffolding & Access' },
  { id: 'sa-6', name: 'Safety Netting', category: 'Scaffolding & Access' },
  { id: 'sa-7', name: 'Fall Protection Kit', category: 'Scaffolding & Access' },
  // Transportation
  { id: 'tr-1', name: 'Flatbed Truck', category: 'Transportation' },
  { id: 'tr-2', name: 'Dump Truck', category: 'Transportation' },
  { id: 'tr-3', name: 'Crane (mobile)', category: 'Transportation' },
  { id: 'tr-4', name: 'Material Hoist', category: 'Transportation' },
  { id: 'tr-5', name: 'Dumpster (roll-off)', category: 'Transportation' },
  // Specialty
  { id: 'sp-1', name: 'Concrete Pump', category: 'Specialty' },
  { id: 'sp-2', name: 'Concrete Vibrator', category: 'Specialty' },
  { id: 'sp-3', name: 'Laser Level', category: 'Specialty' },
  { id: 'sp-4', name: 'Total Station', category: 'Specialty' },
  { id: 'sp-5', name: 'Moisture Meter', category: 'Specialty' },
  { id: 'sp-6', name: 'Thermal Camera', category: 'Specialty' },
  { id: 'sp-7', name: 'Dehumidifier (commercial)', category: 'Specialty' },
  { id: 'sp-8', name: 'Temporary Power Panel', category: 'Specialty' },
];
