export type COStatus =
  | 'draft'
  | 'shared'
  | 'work_in_progress'
  | 'closed_for_pricing'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'contracted'
  | 'withdrawn';

export type COPricingType = 'fixed' | 'tm' | 'nte';

export type COCreatedByRole = 'GC' | 'TC' | 'FC';

export type COLaborRole = 'FC' | 'TC';

export type COPricingMode = 'hourly' | 'lump_sum';

export type COReasonCode =
  | 'addition'
  | 'rework'
  | 'design_change'
  | 'owner_request'
  | 'gc_request'
  | 'damaged_by_others'
  | 'other';

export const CO_REASON_LABELS: Record<COReasonCode, string> = {
  addition:          'Addition',
  rework:            'Rework',
  design_change:     'Design change',
  owner_request:     'Owner request',
  gc_request:        'GC request',
  damaged_by_others: 'Damaged by others',
  other:             'Other',
};

export const CO_REASON_COLORS: Record<COReasonCode, { bg: string; text: string }> = {
  addition:          { bg: '#EFF6FF', text: '#1D4ED8' },
  rework:            { bg: '#FFFBEB', text: '#B45309' },
  design_change:     { bg: '#F5F3FF', text: '#6D28D9' },
  owner_request:     { bg: '#F0FDF4', text: '#15803D' },
  gc_request:        { bg: '#F0FDF4', text: '#15803D' },
  damaged_by_others: { bg: '#FEF2F2', text: '#B91C1C' },
  other:             { bg: '#F9FAFB', text: '#6B7280' },
};

export const CO_STATUS_LABELS: Record<COStatus, string> = {
  draft:              'Draft',
  shared:             'Shared',
  work_in_progress:   'Work in Progress',
  closed_for_pricing: 'Closed for Pricing',
  submitted:          'Submitted',
  approved:           'Approved',
  rejected:           'Rejected',
  contracted:         'Contracted',
  withdrawn:          'Withdrawn',
};

export type CODocumentType = 'CO' | 'WO';

export interface ChangeOrder {
  id: string;
  org_id: string;
  project_id: string;
  created_by_user_id: string;
  created_by_role: COCreatedByRole;
  co_number: string | null;
  title: string | null;
  status: COStatus;
  pricing_type: COPricingType;
  nte_cap: number | null;
  nte_increase_requested: number | null;
  nte_increase_approved: boolean | null;
  reason: COReasonCode | null;
  reason_note: string | null;
  location_tag: string | null;
  assigned_to_org_id: string | null;
  fc_input_needed: boolean;
  materials_needed: boolean;
  materials_on_site: boolean;
  equipment_needed: boolean;
  materials_responsible: 'GC' | 'TC' | null;
  equipment_responsible: 'GC' | 'TC' | null;
  shared_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_note: string | null;
  contracted_at: string | null;
  draft_shared_with_next: boolean;
  /* New CO flow fields */
  use_fc_pricing_base: boolean;
  closed_for_pricing_at: string | null;
  completed_at: string | null;
  completion_acknowledged_at: string | null;
  tc_snapshot_hourly_rate: number | null;
  tc_snapshot_markup_percent: number | null;
  tc_submitted_price: number | null;
  fc_pricing_submitted_at: string | null;
  document_type: CODocumentType;
  withdrawn_at: string | null;
  withdrawn_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface COLineItem {
  id: string;
  co_id: string;
  org_id: string;
  created_by_role: COCreatedByRole;
  catalog_item_id: string | null;
  item_name: string;
  division: string | null;
  category_name: string | null;
  unit: string;
  qty: number | null;
  sort_order: number;
  location_tag: string | null;
  reason: COReasonCode | null;
  description: string | null;
  pricing_type: COPricingType | null;
  nte_cap: number | null;
  created_at: string;
}

export interface COLaborEntry {
  id: string;
  co_id: string;
  co_line_item_id: string;
  org_id: string;
  entered_by_role: COLaborRole;
  entry_date: string;
  pricing_mode: COPricingMode;
  hours: number | null;
  hourly_rate: number | null;
  lump_sum: number | null;
  line_total: number;
  description: string | null;
  is_actual_cost: boolean;
  actual_cost_note: string | null;
  created_at: string;
}

export interface COMaterialItem {
  id: string;
  co_id: string;
  org_id: string;
  added_by_role: string;
  line_number: number;
  description: string;
  supplier_sku: string | null;
  quantity: number;
  uom: string;
  unit_cost: number | null;
  line_cost: number;
  markup_percent: number;
  markup_amount: number;
  billed_amount: number;
  notes: string | null;
  is_on_site: boolean;
  created_at: string;
}

export interface COEquipmentItem {
  id: string;
  co_id: string;
  org_id: string;
  added_by_role: string;
  description: string;
  duration_note: string | null;
  cost: number;
  markup_percent: number;
  markup_amount: number;
  billed_amount: number;
  notes: string | null;
  created_at: string;
}

export interface CONTELogEntry {
  id: string;
  co_id: string;
  requested_by_user_id: string;
  requested_increase: number;
  running_total_at_request: number;
  current_cap_at_request: number;
  approved_by_user_id: string | null;
  approved_at: string | null;
  new_cap_after_approval: number | null;
  rejected_at: string | null;
  rejection_note: string | null;
  created_at: string;
}

export interface COActivityEntry {
  id: string;
  co_id: string;
  project_id: string;
  actor_user_id: string;
  actor_role: string;
  action: string;
  detail: string | null;
  amount: number | null;
  created_at: string;
}

export interface COFinancials {
  laborTotal: number;
  fcLaborTotal: number;
  fcTotalHours: number;
  fcLumpSumTotal: number;
  tcLaborTotal: number;
  materialsTotal: number;
  materialsCost: number;
  materialsMarkup: number;
  equipmentTotal: number;
  equipmentCost: number;
  equipmentMarkup: number;
  grandTotal: number;
  actualCostTotal: number;
  tcActualCostTotal: number;
  fcActualCostTotal: number;
  tcBillableToGC: number;
  profitMargin: number | null;
  nteUsedPercent: number | null;
}

export interface ScopeCatalogItem {
  id: string;
  division: string;
  category_id: string;
  category_name: string;
  group_id: string;
  group_label: string;
  item_name: string;
  unit: string;
  category_color: string;
  category_bg: string;
  category_icon: string;
  sort_order: number;
  org_id: string | null;
  /** Phase 4 — optional AI provenance, populated when item is suggested via QA */
  qty?: number | null;
  quantity_source?: 'ai' | 'manual' | 'photo' | null;
  ai_confidence?: number | null;
  ai_reasoning?: string | null;
}

/** @deprecated Use ScopeCatalogItem instead */
export type WorkOrderCatalogItem = ScopeCatalogItem;

export type COWorkType =
  | 'framing'
  | 'structural'
  | 'wrb'
  | 'demo'
  | 'sheathing'
  | 'blocking'
  | 'exterior'
  | 'backout'
  | 'stairs'
  | 'other';

export interface NewCOLineItem {
  co_id: string;
  org_id: string;
  created_by_role: COCreatedByRole;
  catalog_item_id?: string;
  item_name: string;
  division?: string;
  category_name?: string;
  unit: string;
  qty?: number;
  sort_order?: number;
}

export interface NewCOLaborEntry {
  co_id: string;
  co_line_item_id: string;
  org_id: string;
  entered_by_role: COLaborRole;
  entry_date: string;
  pricing_mode: COPricingMode;
  hours?: number;
  hourly_rate?: number;
  lump_sum?: number;
  description?: string;
  is_actual_cost?: boolean;
  actual_cost_note?: string;
}

export interface NewCOMaterialItem {
  co_id: string;
  org_id: string;
  added_by_role: string;
  line_number: number;
  description: string;
  supplier_sku?: string;
  quantity: number;
  uom: string;
  unit_cost?: number;
  markup_percent?: number;
  notes?: string;
  is_on_site?: boolean;
}

export interface NewCOEquipmentItem {
  co_id: string;
  org_id: string;
  added_by_role: string;
  description: string;
  duration_note?: string;
  cost: number;
  markup_percent?: number;
  notes?: string;
}

export type COCollaboratorType = 'FC';

export type COCollaboratorStatus = 'invited' | 'active' | 'completed' | 'rejected' | 'removed';

export interface COCollaborator {
  id: string;
  co_id: string;
  organization_id: string;
  collaborator_type: COCollaboratorType;
  status: COCollaboratorStatus;
  invited_by_user_id: string;
  completed_by_user_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  organization?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export interface COFCOrgOption {
  id: string;
  name: string;
  type: 'FC';
}
