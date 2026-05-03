/**
 * Shared types extracted from the legacy COWizard.
 * Still consumed by StepCatalog, StepCatalogQA, AddCustomItemDialog, and PickerShell.
 */
import type { COReasonCode, COPricingType, ScopeCatalogItem } from '@/types/changeOrder';
import type { WorkIntent } from '@/types/scopeQA';

export interface SelectedScopeItem extends ScopeCatalogItem {
  locationTag: string;
  reason: COReasonCode;
  reasonDescription: string;
  /** Wizard-only: true when this synthetic item bundles several originals into one row. Not persisted. */
  isCombined?: boolean;
  /** Wizard-only: snapshot of the originals that were merged, so the user can Uncombine. Not persisted. */
  combinedFrom?: SelectedScopeItem[];
  /** Wizard-only: true when item was added via "Add custom item" and may not point at a real catalog row. */
  isCustom?: boolean;
  /** Real catalog_definitions.id when promoted to org catalog; otherwise null for one-offs. */
  catalogId?: string | null;
}

export type AssemblyState = 'pre_rough' | 'roughed' | 'sheathed_decked' | 'dried_in';
export type TriggerCode =
  | 'trade_conflict_mech'
  | 'trade_conflict_elec'
  | 'trade_conflict_plumb'
  | 'inspector_callback'
  | 'owner_request_change'
  | 'field_discovery'
  | 'design_revision';

export const TRIGGER_LABELS: Record<TriggerCode, string> = {
  trade_conflict_mech:  'Mechanical conflict',
  trade_conflict_elec:  'Electrical conflict',
  trade_conflict_plumb: 'Plumbing conflict',
  inspector_callback:   'Inspector callback',
  owner_request_change: 'Owner request',
  field_discovery:      'Field discovery',
  design_revision:      'Design revision',
};

export const ASSEMBLY_STATE_LABELS: Record<AssemblyState, string> = {
  pre_rough:        'Open framing',
  roughed:          'Framed, no sheathing',
  sheathed_decked:  'Sheathed / decked',
  dried_in:         'Dried in / finished',
};

export const ASSEMBLY_STATE_HINTS: Record<AssemblyState, string> = {
  pre_rough:        'No demo needed',
  roughed:          'Light demo only',
  sheathed_decked:  'Open up + repair sequence',
  dried_in:         'Demo + repair + finishes',
};

export interface COWizardData {
  /** Phase B — primary work-intent driver for Sasha's question flow */
  intent?: WorkIntent | null;
  reason: COReasonCode | null;
  workType: string | null;
  /** Phase 2 — what triggered this CO/WO (optional) */
  triggerCode?: TriggerCode | null;
  /** Phase 2 — state of the assembly when issue was found (optional, only relevant for framing zones) */
  assemblyState?: AssemblyState | null;
  locationTag: string;
  selectedItems: SelectedScopeItem[];
  pricingType: COPricingType;
  nteCap: string;
  gcBudget: string;
  assignedToOrgId: string;
  fcOrgId: string;
  fcInputNeeded: boolean;
  materialsNeeded: boolean;
  materialsOnSite: boolean;
  equipmentNeeded: boolean;
  materialsResponsible: 'GC' | 'TC' | null;
  equipmentResponsible: 'GC' | 'TC' | null;
  shareDraftNow: boolean;
  quickHours: number | null;
  aiDescription: string;
  /** Optional user-typed name for the CO/WO. When empty, the title is just `{co_number} · {date}`. */
  coName?: string;
  /** Per-line-item descriptions, keyed by selectedItems[i].id. Drives co_line_items.description. */
  itemDescriptions?: Record<string, string>;
  /** Phase 3 — structured answers from the QA flow, persisted as evidence */
  qaAnswers?: Record<string, string | string[]>;
}
