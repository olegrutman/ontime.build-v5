// Work Order Wizard Types — simplified creation flow

import type { CatalogItem } from './quickLog';

// ─── Wizard path ─────────────────────────────────────────────────
export type WOCreationPath = 'field_capture' | 'full_work_order';

// ─── Wizard State ────────────────────────────────────────────────
export interface WorkOrderWizardData {
  // Step 0 — Path choice
  creation_path: WOCreationPath | null;

  // Step 1 — Scope (Full WO only)
  title: string;
  description: string;
  selectedCatalogItems: CatalogItem[];

  // Step 2 — Location
  location_tags: string[];

  // Step 3 — Assign
  assigned_org_id: string | null;
  participant_org_ids: string[];
  request_fc_input: boolean;
  selected_fc_org_id: string | null;
}

export const INITIAL_WIZARD_DATA: WorkOrderWizardData = {
  creation_path: null,
  title: '',
  description: '',
  selectedCatalogItems: [],
  location_tags: [],
  assigned_org_id: null,
  participant_org_ids: [],
  request_fc_input: false,
  selected_fc_org_id: null,
};

// ─── Wizard Steps ────────────────────────────────────────────────
export interface WizardStepDef {
  key: string;
  title: string;
  description: string;
}

export const FULL_WO_STEPS: WizardStepDef[] = [
  { key: 'path', title: 'Type', description: 'What kind of entry do you want to create?' },
  { key: 'scope', title: 'Scope of Work', description: 'Select tasks from the catalog' },
  { key: 'location', title: 'Location', description: 'Where will this work be performed?' },
  { key: 'assign', title: 'Assign', description: 'Who will work on this?' },
  { key: 'review', title: 'Review & Create', description: 'Review before creating' },
];
