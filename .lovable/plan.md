

# Allow Users to Delete and Re-create SOV (with Upload)

## What's needed

When a user deletes an SOV (which already works via the trash icon), they should be able to re-create it — including uploading their own document — just like they could when the SOV didn't exist yet.

## Current State

- **Delete SOV** already works in `ContractSOVEditor` (trash icon with confirmation dialog, guarded by billing/lock checks).
- After deletion, the contract moves to `contractsMissingSOVs`, and a "Contracts Missing SOV" card appears at the bottom — but it only has a "Create SOV" (from template) button, **no upload option**.
- The "Upload Your SOV" button and `UploadSOVDialog` only appear in the initial "no SOV at all" empty state.

## Plan

**File: `src/components/sov/ContractSOVEditor.tsx`**

1. In the "Contracts Missing SOV" section (lines 841-876), add an "Upload SOV" button next to the existing "Create SOV" button for each contract missing an SOV. This button opens the `UploadSOVDialog` pre-filtered to that specific contract.

2. The `UploadSOVDialog` is already mounted in the component and accepts a `contracts` prop. We need to either:
   - Reuse the existing dialog instance but update which contracts it shows, OR
   - Simply always render the `UploadSOVDialog` with `contractsMissingSOVs` and add another trigger button in the missing-SOV section.

The simplest approach: add an `Upload` button next to each "Create SOV" button in the missing contracts card, which opens the existing `UploadSOVDialog` (already wired with `contractsMissingSOVs`).

**Changes:**
- Add an `<Upload>` icon button next to "Create SOV" in each missing-contract row (line ~864-871)
- The dialog is already rendered at line 231-237 with `contractsMissingSOVs` — clicking "Upload" just sets `setUploadDialogOpen(true)`

This is a small UI change — about 5 lines added.

