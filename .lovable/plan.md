

# Field Capture Draft Page

## Problem
After a field capture, the user is sent to the full Work Order detail page (`/change-order/:id`) which is complex, doesn't create a task from the capture, and isn't designed for the incremental "capture → add more → submit" workflow.

## Solution
Create a dedicated **Field Capture Draft** page at `/field-capture-draft/:id` (where `id` is the draft WO id). This page is a simplified, mobile-friendly workspace focused on accumulating captures before submitting.

### New Page: `src/components/field-capture-draft/FieldCaptureDraftPage.tsx`

**What it shows:**
- Header with draft title (editable), project name, back button
- List of all `field_captures` linked to this WO (`converted_work_order_id = id`) plus any with status `captured` for this project
- Each capture shown as a card (photo thumbnail, description, voice note, reason badge, timestamp)
- **"+ Add Capture" button** — opens `FieldCaptureSheet` with `onCaptureComplete` that links the new capture to this WO (updates `converted_work_order_id` and status)
- **Work Order Tasks section** — shows tasks from `work_order_tasks` for this WO. Each linked capture auto-creates a task (title from description, photo/voice attached). User can also manually add tasks via `AddTaskSheet`.
- **"Submit for Approval" button** at the bottom — calls `updateStatus` to move the WO from `draft` → `ready_for_approval` (or the appropriate next status based on role), then navigates to the full detail page

**Sidebar (desktop) / bottom section (mobile):**
- Summary: capture count, task count
- Status badge (Draft)

### New Hook: `src/hooks/useFieldCapturesByWorkOrder.ts`
Simple query: `field_captures` where `converted_work_order_id = woId`, ordered by `timestamp desc`. Includes realtime subscription.

### Changes to existing files:

**`src/App.tsx`** — Add route `/field-capture-draft/:id` → `FieldCaptureDraftPage`

**`src/components/project/WorkOrdersTab.tsx`** — Change `onCaptureComplete` navigation from `/change-order/${draftId}` to `/field-capture-draft/${draftId}`

**`src/components/field-capture-draft/FieldCaptureDraftPage.tsx`** — Auto-create a `work_order_task` from the capture data (description, photo_url, voice_note_url, reason_category) when a capture is linked. This ensures every capture becomes a visible task.

### Submit Flow
When user clicks "Submit for Approval":
1. Validate at least 1 task exists
2. Update WO status from `draft` → `ready_for_approval`
3. Navigate to `/change-order/${id}` (full detail page for the approval workflow)
4. Toast: "Work order submitted for approval"

### Files
| File | Action |
|---|---|
| `src/components/field-capture-draft/FieldCaptureDraftPage.tsx` | **Create** — main page component |
| `src/components/field-capture-draft/index.ts` | **Create** — barrel export |
| `src/hooks/useFieldCapturesByWorkOrder.ts` | **Create** — fetch captures linked to WO |
| `src/App.tsx` | **Edit** — add route |
| `src/components/project/WorkOrdersTab.tsx` | **Edit** — change navigation target |

