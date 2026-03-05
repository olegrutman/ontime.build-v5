

# Fix: Upload SOV Button Not Working in Missing Contracts Section

## Problem

The "Upload SOV" button in the "Contracts Missing SOV" section does nothing because the `UploadSOVDialog` component is only rendered inside the empty-state block (when no SOVs exist at all). Once at least one SOV exists, that block doesn't render, so clicking the button sets state but there's no dialog to show.

## Fix

**File: `src/components/sov/ContractSOVEditor.tsx`**

Move (or duplicate) the `UploadSOVDialog` rendering to a location that's always mounted — right before the closing `</div>` of the component (line 888), outside of any conditional block. This ensures the dialog is available regardless of whether SOVs exist or not.

The dialog already accepts `contractsMissingSOVs` as its contracts prop in the empty-state path, so the same logic applies. We just need one unconditional render of the dialog at the component root level.

