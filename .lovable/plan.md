

# Allow Platform Owner to Delete Invoices, POs, and Work Orders

## Overview

Add three new delete actions to the Platform Project Detail page, following the same pattern as the existing "Delete Project" button — each requires a reason, uses the `platform-support-action` edge function with `service_role`, snapshots before deletion, and logs to `support_actions_log`.

## Changes

### 1. Edge Function — Add 3 new action handlers

**File**: `supabase/functions/platform-support-action/index.ts`

Add to `ACTION_MIN_ROLE`:
- `DELETE_INVOICE: "PLATFORM_OWNER"`
- `DELETE_PURCHASE_ORDER: "PLATFORM_OWNER"`
- `DELETE_WORK_ORDER: "PLATFORM_OWNER"`

Add 3 new `case` blocks:

**DELETE_INVOICE**: Snapshot invoice number/status/amount → delete `invoice_line_items` (cascade handles this) → delete invoice → log with invoice number in summary.

**DELETE_PURCHASE_ORDER**: Snapshot PO number/status/total → nullify `invoices.po_id` where `po_id = id` → nullify `change_order_projects.linked_po_id` → delete `return_items` referencing PO → nullify `daily_log_deliveries.po_id` → delete PO (cascades `po_line_items`) → log.

**DELETE_WORK_ORDER**: Snapshot WO title/status/final_price → nullify `work_order_line_items.change_order_id`, `work_order_materials.change_order_id`, `work_order_equipment.change_order_id` → nullify `supplier_estimates.work_order_id`, `work_order_log_items.linked_change_order_id`, `project_schedule_items.work_order_id`, `field_captures.converted_work_order_id` → delete WO (cascades participants, tasks, checklist, tc_labor, fc_hours, materials, equipment, time_cards, actual_cost_entries) → clean up notifications → log.

### 2. Types — Add new action types

**File**: `src/types/platform.ts`

Add `'DELETE_INVOICE' | 'DELETE_PURCHASE_ORDER' | 'DELETE_WORK_ORDER'` to `SupportActionType`.

Add labels to `ACTION_TYPE_LABELS`.

### 3. Platform Project Detail — Add delete buttons to tables

**File**: `src/pages/platform/PlatformProjectDetail.tsx`

- Add a "Delete" column to the Invoices table. Each row gets a red trash icon button (visible only for `PLATFORM_OWNER`).
- Same for Purchase Orders table.
- Add a new **Work Orders** table section (currently only shows status counts). Fetch recent `change_order_projects` for the project. Each row gets a delete button.
- Add 3 new `SupportActionDialog` instances (one per entity type) with state for the selected item ID and descriptive confirmation text.
- On successful delete, call `fetchData()` to refresh.

### 4. Work Orders data fetch

Add to `fetchData()`:
```
supabase.from('change_order_projects')
  .select('id, co_number, title, status, final_price, created_at')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false })
  .limit(10)
```

Add `WorkOrderRow` interface and state.

### FK Cleanup Summary

| Entity | Children that CASCADE | Children needing explicit cleanup |
|---|---|---|
| Invoice | `invoice_line_items` | None |
| Purchase Order | `po_line_items` | `invoices.po_id` (SET NULL), `change_order_projects.linked_po_id` (NO ACTION), `return_items.po_id` (NO ACTION), `daily_log_deliveries.po_id` (NO ACTION) |
| Work Order | `change_order_participants`, `work_order_tasks`, `change_order_checklist`, `tm_time_cards`, `actual_cost_entries`, `change_order_fc_hours`, `change_order_tc_labor`, `change_order_materials`, `change_order_equipment` | `work_order_line_items` (SET NULL), `work_order_materials` (SET NULL), `work_order_equipment` (SET NULL), `supplier_estimates.work_order_id` (NO ACTION), `work_order_log_items` (NO ACTION), `project_schedule_items` (SET NULL), `field_captures` (NO ACTION) |

