

# Field Capture → Work Order Flow

## Problem
When a user selects "Field Capture" in the wizard and saves a capture, nothing happens afterward. The capture is saved to `field_captures` but no work order is created. The user expects:
1. Field capture saves → a draft work order is automatically created (linked to the capture)
2. User is navigated to the work order detail page where they can add more tasks/line items
3. When ready, user submits/converts the draft into a full work order

## Changes

### 1. `WorkOrdersTab.tsx` — Add post-capture handler

Add an `onCaptureComplete` callback to `FieldCaptureSheet` that:
- Creates a draft `change_order_projects` record (via `saveDraft`) with title from the capture description or "Field Capture"
- Links the field capture to the new WO by updating `field_captures.converted_work_order_id`
- Updates the capture status to `converted`
- Navigates to `/change-order/{newDraftId}` so the user lands on the detail page

The `FieldCaptureSheet` component needs a new optional prop: `onCaptureComplete?: (captureId: string, captureData: { description?: string; photo_url?: string; voice_note_url?: string; reason_category?: string }) => void`

### 2. `FieldCaptureSheet.tsx` — Call onCaptureComplete after save

After `createCapture.mutateAsync` succeeds, if `onCaptureComplete` prop exists, call it with the returned capture ID and relevant data. Don't close the sheet — let the parent handle navigation.

### 3. `WorkOrdersTab.tsx` — Implement the handler

```
const handleFieldCaptureComplete = async (captureId, captureData) => {
  // 1. Create draft WO
  const draftId = await saveDraft({
    title: captureData.description || 'Field Capture',
    wo_mode: 'quick_capture',
    pricing_mode: 'fixed',
  });
  // 2. Link capture to WO
  await supabase.from('field_captures')
    .update({ converted_work_order_id: draftId, status: 'converted' })
    .eq('id', captureId);
  // 3. Navigate to detail page
  setShowFieldCapture(false);
  navigate(`/change-order/${draftId}`);
};
```

### Files to change
| File | Change |
|---|---|
| `src/components/field-capture/FieldCaptureSheet.tsx` | Add `onCaptureComplete` prop, call it after successful save |
| `src/components/project/WorkOrdersTab.tsx` | Pass `onCaptureComplete` to `FieldCaptureSheet`, implement the handler that creates draft WO + navigates |

### What already works (no changes needed)
- The detail page (`ChangeOrderDetailPage`) already supports adding line items, materials, equipment to a draft WO
- The `useWorkOrderDraft.convertMutation` already handles submitting a draft as a full work order
- The submit/convert flow on the detail page already exists

