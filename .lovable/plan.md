

# Allow Platform Owner to Delete Change Orders

## What changes

Add a `DELETE_CHANGE_ORDER` action following the exact same pattern as `DELETE_INVOICE`, `DELETE_PURCHASE_ORDER`, and `DELETE_WORK_ORDER`.

## 1. Edge function — `platform-support-action/index.ts`

- Add `DELETE_CHANGE_ORDER: "PLATFORM_OWNER"` to `ACTION_MIN_ROLE`
- Add a new `case "DELETE_CHANGE_ORDER"` block:
  1. Require `co_id` param
  2. Fetch CO snapshot (`co_number`, `status`, `pricing_type`, `project_id`) from `change_orders`
  3. Nullify non-cascading FKs:
     - `change_orders.combined_co_id` and `parent_co_id` (self-refs, NO ACTION)
     - `purchase_orders.source_change_order_id` (SET NULL)
     - Remove CO id from `invoices.co_ids` array (array column, not FK)
  4. Clean up notifications: `DELETE FROM notifications WHERE entity_type = 'change_order' AND entity_id = co_id`
  5. Delete the CO — child tables (`co_line_items`, `co_labor_entries`, `co_material_items`, `co_equipment_items`, `co_nte_log`, `co_activity`, `change_order_collaborators`, `co_combined_members`) all CASCADE automatically
  6. Log with project context

## 2. Frontend — `PlatformProjectDetail.tsx`

- Add CO interface, state variables, fetch query, table section, and delete dialog — mirroring the PO pattern exactly
- Fetch `change_orders` for the project (id, co_number, status, pricing_type, created_at, plus the grand total via a simple field if available)
- Add a "Change Orders" card with table showing CO#, status, type, created date, and a delete button (Platform Owner only)
- Add `SupportActionDialog` for delete confirmation

## 3. Types — `platform.ts`

- Add `'DELETE_CHANGE_ORDER'` to `SupportActionType` union
- Add label to `ACTION_TYPE_LABELS`: `'Change Order Deleted'`

## Files changed

| File | Change |
|------|--------|
| `supabase/functions/platform-support-action/index.ts` | Add `DELETE_CHANGE_ORDER` case + permission |
| `src/pages/platform/PlatformProjectDetail.tsx` | Add CO table + delete button + dialog |
| `src/types/platform.ts` | Add type + label |

