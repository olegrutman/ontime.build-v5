

# Work Order Wizard Rewrite — Implementation Plan

## What We're Building

A single `WorkOrderWizard` component replacing both `ChangeOrderWizardDialog` and `UnifiedWOWizard`. It serves all three roles (GC, TC, FC) with role-adaptive steps, full-screen layout, live financial summary, and proper database persistence including an Assign step and line-item-level submission.

## Current State

- **Database**: All required tables (`work_order_line_items`, `work_order_materials`, `work_order_equipment`) and columns (`wo_mode`, `wo_request_type`, `location_tag`, `draft_started_at`, `converted_at`, `submitted_by_user_id`, `labor_rate` on `project_team`, `default_materials_markup_pct` / `default_equipment_markup_pct` on `organizations`) already exist. No schema changes needed.
- **Existing components**: `CatalogBrowser` is reusable as-is. `FieldCaptureSheet` stays untouched. `useWorkOrderDraft` hook handles draft persistence and conversion. `useProjectLaborRates` handles rate read/write.
- **Entry points**: `UnifiedWOWizard` is imported in `WorkOrdersTab.tsx`, `ChangeOrders.tsx`, and `RFIsTab.tsx`. `ChangeOrderWizardDialog` is imported only from its own barrel file (no external consumers).

## Implementation Steps

### 1. Create new WorkOrderWizard component
**File**: `src/components/work-order-wizard/WorkOrderWizard.tsx`

Full-screen dialog (desktop) / sheet (mobile). Left sidebar with step list on desktop, progress bar on mobile. Financial summary bar pinned at bottom.

Steps in order (role-filtered):
- Step 0 — Intent (TC only): Two cards, same as existing `IntentStep`
- Step 1 — Mode: Two cards, same as existing `CaptureModeStep`  
- Step 2 — Scope: Import `CatalogBrowser` directly from `@/components/quick-log/CatalogBrowser`. Multi-select with chip tray. Title input for Full Scope only. Scope description textarea with auto-fill for Quick Capture.
- Step 3 — Location: Chip groups from project scope (buildings, levels, units, elevations, other). Auto-save draft for Quick Capture when scope+location are set.
- Step 4 — Labor: Hourly/Lump sum toggle. Rate from `useProjectLaborRates`. TC toggle for FC billing.
- Step 5 — Materials: TC markup default from `organizations.default_materials_markup_pct`. Row-based entry. Supplier field visible for all.
- Step 6 — Equipment: Same pattern as Materials. New flat equipment picker (searchable list of ~35 common items grouped by 5 categories). Picker slides up from "Pick from list" button.
- Step 7 — Assign (GC and TC only): GC selects TC from project team. TC optionally requests FC input and/or adds participants.
- Step 8 — Review: Read-only summary with edit jumps. Quick Capture gets dual buttons (save draft / submit with item checkboxes). Full Scope gets single submit.

### 2. Create new step components

Rewrite each step from scratch in `src/components/work-order-wizard/steps/`:

- `IntentStep.tsx` — port from unified, no changes
- `CaptureModeStep.tsx` — port from unified, no changes
- `ScopeStep.tsx` — **NEW**: Uses `CatalogBrowser` directly (imported, not rewritten). Multi-select mode (the existing CatalogBrowser only supports single-select via `selectedItemId`/`onSelect`). We'll wrap it to support multi-select by managing selection state externally and rendering checkboxes on items.
- `LocationStep.tsx` — port with auto-save logic added
- `LaborStep.tsx` — port with running total display and rate save-back
- `MaterialsStep.tsx` — port with org default markup fetch
- `EquipmentStep.tsx` — port with new flat equipment picker
- `AssignStep.tsx` — **NEW**: GC picks TC, TC optionally picks FC and additional participants
- `ReviewStep.tsx` — rewrite with Quick Capture dual-action (item checkboxes + selective submit)

### 3. Build EquipmentPicker component
**File**: `src/components/work-order-wizard/EquipmentPicker.tsx`

Flat searchable list of ~35 equipment items across 5 categories (Heavy Equipment, Power Tools, Scaffolding & Access, Transportation, Specialty). Same visual style as CatalogBrowser but single-level. Selecting adds a row and closes picker.

### 4. Build FinancialSummaryBar component
**File**: `src/components/work-order-wizard/FinancialSummaryBar.tsx`

Pinned at bottom. Role-aware content:
- TC: Full breakdown with labor (FC + TC), materials cost/markup/billed, equipment cost/markup/billed, total billed to GC, TC total cost, running margin (color-coded)
- FC: Labor, materials, equipment, total FC claim
- GC: Labor total, materials total, equipment total, grand total

### 5. Update entry points

**`WorkOrdersTab.tsx`**: Replace `UnifiedWOWizard` import with new `WorkOrderWizard`. Keep `handleWizardComplete` but update to handle the new Assign step data (assigned_org_id, participant_org_ids, fc_requested).

**`ChangeOrders.tsx`**: Same replacement.

**`RFIsTab.tsx`**: Same replacement, passing RFI context as initial scope data.

### 6. Update handleWizardComplete / submission logic

The submission handler in `WorkOrdersTab.tsx` and `ChangeOrders.tsx` needs to:
1. Save draft header via `useWorkOrderDraft.saveDraft()`
2. Insert line items, materials, equipment
3. Insert participants via `change_order_participants`
4. For "Submit for approval": call `convertToWorkOrder()` which sets statuses, computes totals, sets `converted_at`
5. Insert `project_activity` record
6. For Quick Capture "Save draft": just save and close, status stays `draft`

### 7. Scope step — CatalogBrowser integration

The existing `CatalogBrowser` supports single-select (`selectedItemId` + `onSelect`). The spec requires multi-select. Two options:
- **Option A**: Build a wrapper that renders CatalogBrowser in a controlled way, intercepting selections to toggle in/out of a Set, and overriding the visual selected state per item.
- **Option B**: Build the catalog drill-down inline (as the current `ScopeStep` already does).

**Decision**: Keep the current inline approach from `ScopeStep` (it already supports multi-select perfectly). The spec says "use CatalogBrowser as-is" but the existing ScopeStep already replicates CatalogBrowser's drill-down with multi-select support. We'll keep this pattern since CatalogBrowser doesn't support multi-select natively.

### 8. Delete old components

After confirming the new wizard works:
- Delete `src/components/unified-wo-wizard/` (entire directory)
- Delete `src/components/change-order-wizard/ChangeOrderWizardDialog.tsx`
- Keep `src/components/change-order-wizard/index.ts` exporting nothing (or remove if no other imports)
- Keep `src/components/work-order-wizard/WizardProgress.tsx` (used by other wizards)
- Update `src/components/work-order-wizard/index.ts` to export `WorkOrderWizard` and `WizardProgress`

### 9. Types update

**File**: `src/types/workOrderWizard.ts` (recreate)

New `WorkOrderWizardData` type extending `UnifiedWizardData` with:
- `assigned_org_id: string | null`
- `participant_org_ids: string[]`
- `request_fc_input: boolean`
- `selected_fc_org_id: string | null`
- `submit_item_ids: string[]` (for Quick Capture selective submit)

### What stays untouched
- `change_order_projects` existing columns
- Approval flow: `ApprovalPanel`, `ChangeOrderChecklist`, `ContractedPricingCard`
- Invoice/payment/PO flows
- `project_activity` table
- Existing Supabase RPC functions
- Sidebar, topbar, project tabs
- `WorkOrderTopBar`, `WorkOrderProgressBar`, `TMTimeCardsPanel`
- `CatalogBrowser` component
- `FieldCaptureSheet` component
- `ChangeOrderDetailPage` (kept as-is for now)

## File Summary

| Action | File |
|--------|------|
| Create | `src/components/work-order-wizard/WorkOrderWizard.tsx` |
| Create | `src/components/work-order-wizard/steps/IntentStep.tsx` |
| Create | `src/components/work-order-wizard/steps/CaptureModeStep.tsx` |
| Create | `src/components/work-order-wizard/steps/ScopeStep.tsx` |
| Create | `src/components/work-order-wizard/steps/LocationStep.tsx` |
| Create | `src/components/work-order-wizard/steps/LaborStep.tsx` |
| Create | `src/components/work-order-wizard/steps/MaterialsStep.tsx` |
| Create | `src/components/work-order-wizard/steps/EquipmentStep.tsx` |
| Create | `src/components/work-order-wizard/steps/AssignStep.tsx` |
| Create | `src/components/work-order-wizard/steps/ReviewStep.tsx` |
| Create | `src/components/work-order-wizard/EquipmentPicker.tsx` |
| Create | `src/components/work-order-wizard/FinancialSummaryBar.tsx` |
| Create | `src/types/workOrderWizard.ts` |
| Edit | `src/components/work-order-wizard/index.ts` |
| Edit | `src/components/project/WorkOrdersTab.tsx` |
| Edit | `src/pages/ChangeOrders.tsx` |
| Edit | `src/components/rfi/RFIsTab.tsx` |
| Delete | `src/components/unified-wo-wizard/` (entire directory) |
| Delete | `src/components/change-order-wizard/ChangeOrderWizardDialog.tsx` |

