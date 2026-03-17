

# Field Capture → Work Order: Bug Analysis and Fix Plan

## Current Flow (What Happens Now)

1. User opens Field Capture from WorkOrdersTab wizard
2. User takes photo / writes note / records voice → taps "Save Capture"
3. `FieldCaptureSheet` saves capture to `field_captures` table, then calls `onCaptureComplete` with the capture ID and data
4. `WorkOrdersTab.onCaptureComplete` creates a draft WO via `saveDraft()`, links the capture (`converted_work_order_id`), and navigates to `/field-capture-draft/{draftId}`
5. User lands on `FieldCaptureDraftPage` showing "0 tasks" and "1 capture"

## Bugs Found

### Bug 1: First capture never becomes a task
In `WorkOrdersTab.tsx` lines 411-426, after creating the draft WO and linking the capture, the code **never creates a `work_order_task`** from the first capture's data. It just navigates away. The user arrives at the draft page seeing "No tasks yet" despite having just captured an issue.

Compare this with `FieldCaptureDraftPage.handleCaptureComplete` (line 58-81) which correctly calls `addTask.mutateAsync()` for subsequent captures. The initial capture is missing this step.

### Bug 2: Draft page not accessible from Work Orders list
There is no way to return to a field-capture draft from the Work Orders tab. Draft WOs with `wo_mode = 'quick_capture'` appear in the regular WO list but clicking them navigates to `/change-order/:id` (the full detail page), not `/field-capture-draft/:id`.

## Fix Plan

### 1. `WorkOrdersTab.tsx` — Create task from first capture
After `saveDraft()` and linking the capture, also insert a `work_order_task` row with the capture's description, photo_url, voice_note_url, and reason. This mirrors exactly what `FieldCaptureDraftPage.handleCaptureComplete` does.

```
// After linking capture to WO, also create a task:
await supabase.from('work_order_tasks').insert({
  work_order_id: draftId,
  sort_order: 0,
  title: captureData.description || 'Field Capture',
  description: captureData.description || null,
  photo_url: captureData.photo_url || null,
  voice_note_url: captureData.voice_note_url || null,
  reason: captureData.reason_category || null,
  field_capture_id: captureId,
  created_by: user?.id || null,
});
```

### 2. `WorkOrdersTab.tsx` — Route quick-capture drafts to the draft page
In the work order list row click handler, check if the WO has `wo_mode = 'quick_capture'` and `status = 'draft'`. If so, navigate to `/field-capture-draft/:id` instead of `/change-order/:id`.

### Files to Change

| File | Change |
|---|---|
| `src/components/project/WorkOrdersTab.tsx` | Add `work_order_tasks` insert in `onCaptureComplete`; route quick-capture drafts to `/field-capture-draft/:id` |

## Intended Flow After Fix

1. User opens Field Capture → takes photo → saves
2. Draft WO is created, capture is linked, **task is created from capture data**
3. User lands on `/field-capture-draft/{id}` seeing **1 capture, 1 task**
4. User can tap "+ Add Capture" to add more (each creates another task)
5. User can come back later — clicking a quick-capture draft from the WO list routes to the draft page
6. When ready, user taps "Submit for Approval" → WO status becomes `ready_for_approval` → navigates to full detail page

