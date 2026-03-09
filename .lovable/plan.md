
## Understanding

When a SOV is created (via template or upload), automatically create a matching schedule task for each SOV line item. The title of the schedule task = the SOV item name, and they are pre-linked via `sov_item_id`.

## Current State

There are **three places** where SOV items get inserted into `project_sov_items`:

1. **`createAllSOVs`** in `useContractSOV.ts` (line ~581) — bulk create from template
2. **`createSOVForContract`** in `useContractSOV.ts` (line ~705) — single contract from template
3. **`handleApply`** in `UploadSOVDialog.tsx` (line ~148) — from uploaded PDF/CSV

After each of these, we need to also insert into `project_schedule_items` one row per SOV item, with:
- `title` = SOV item name
- `item_type` = `'task'`
- `sov_item_id` = the new SOV item's id
- `start_date` = today (user can update after)
- `progress` = 0
- `project_id` = projectId

## Plan

### 1. Extract a shared helper
Create a helper function `createScheduleItemsFromSOVItems(projectId, sovItems)` in `useContractSOV.ts` that bulk-inserts schedule tasks from a list of newly created SOV items (with their ids).

### 2. Call it in all 3 SOV creation paths

**`createAllSOVs`** — after each contract's SOV items are inserted (inside the `for` loop), fetch the newly created items' ids and call the helper.

**`createSOVForContract`** — same, after items insert, call helper.

**`UploadSOVDialog.tsx` → `handleApply`** — after `project_sov_items` insert, fetch the inserted items' ids and call the schedule insert.

### 3. Toast message update
Update the success toasts to mention that schedule tasks were also auto-created, e.g. "Created 12 schedule tasks from SOV items."

## What changes

| File | Change |
|---|---|
| `src/hooks/useContractSOV.ts` | Add helper + call it in `createAllSOVs` and `createSOVForContract` |
| `src/components/sov/UploadSOVDialog.tsx` | Call schedule insert after SOV items are created |

No database migration needed — `project_schedule_items` already has `sov_item_id` from the previous implementation.

## Behavior after

- User clicks "Create SOVs from Template" → SOV items created → schedule tasks auto-created with matching names and SOV links
- User uploads SOV PDF/CSV and applies → same auto-creation
- Schedule tab instantly shows all tasks, each already linked to its SOV item for bidirectional sync
- User can edit dates, set progress, reorder — everything already connected
