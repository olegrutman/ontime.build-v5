

# Auto-Create Schedule Tasks from SOV Items — COMPLETED

## Feature
When a SOV is created (via template or upload), automatically create a matching schedule task for each SOV line item. The task title = SOV item name, and they are pre-linked via `sov_item_id`.

## Changes Made

### 1. Helper Function Added (`useContractSOV.ts`)
Created `createScheduleItemsFromSOVItems(projectId, sovItems)` that bulk-inserts schedule tasks from newly created SOV items.

### 2. Template-Based SOV Creation Updated
- `createAllSOVs` — now calls `.select('id, item_name, sort_order')` after insert and auto-creates schedule tasks
- `createSOVForContract` — same pattern, auto-creates schedule tasks

### 3. Upload SOV Creation Updated (`UploadSOVDialog.tsx`)
- `handleApply` — now fetches inserted item IDs and creates matching schedule tasks

### 4. Toast Messages Updated
All SOV creation toasts now mention that schedule tasks were also auto-created.

## Files Changed
- `src/hooks/useContractSOV.ts` — Added helper + integrated into both template creation paths
- `src/components/sov/UploadSOVDialog.tsx` — Integrated schedule task creation into upload flow

## Behavior After
- User clicks "Create SOVs from Template" → SOV items + schedule tasks auto-created
- User uploads SOV PDF/CSV and applies → same auto-creation
- Schedule tab instantly shows all tasks, each already linked to its SOV item
