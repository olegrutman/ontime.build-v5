

# Add Field Captures to Work Orders Tab

## What Changes

### 1. Add Field Captures section to `WorkOrdersTab.tsx`
- Import `FieldCaptureList` and render it above the work orders list (after the summary cards, before the filter/header row)
- Wire the `onConvert` callback to open the Work Order Wizard (or FC Dialog) pre-filled with capture data
- Pass the project's `organizationId` from `userOrgRoles`

### 2. Update button text in `FieldCaptureCard.tsx`
- Change "Convert to Task" → "Convert to Work Order"

### 3. Wire conversion flow
- When user clicks "Convert to Work Order" on a capture card:
  - If FC role: open `FCWorkOrderDialog` pre-filled with capture's description, reason, photo
  - If GC/TC: open `WorkOrderWizard` pre-filled with capture data
- After successful creation, update the capture's status to `converted` via `updateCapture`

### Files Modified
- `src/components/project/WorkOrdersTab.tsx` — Add `FieldCaptureList` section and conversion handler
- `src/components/field-capture/FieldCaptureCard.tsx` — Change button label to "Convert to Work Order"

