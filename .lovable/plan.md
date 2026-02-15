
# Streamline Supplier Estimate Upload Flow

## What Changes

### 1. Redesign "Create New Estimate" dialog to show Project Name first, then Estimate Name
**File: `src/pages/SupplierProjectEstimates.tsx`**

Reorder the Create Estimate dialog fields:
- Project selector comes first (top)
- Estimate name input comes second
- This matches the user's mental model: "which project?" then "what's this estimate called?"

### 2. After creating estimate, go straight to the upload wizard (skip the detail sheet)
**File: `src/pages/SupplierProjectEstimates.tsx`**

In `handleCreateEstimate`, after successful creation:
- Instead of just refreshing the list, immediately open the `EstimateUploadWizard` with the new estimate's ID
- Skip the detail sheet entirely -- the supplier lands directly on the upload screen

### 3. Remove the "choose" step from EstimateUploadWizard -- go straight to upload
**File: `src/components/estimate-upload/EstimateUploadWizard.tsx`**

- Remove the step chooser screen (PDF vs CSV)
- Default to the upload step directly (accept both PDF and CSV in one unified upload area)
- Rename "Upload CSV" button to just "Upload" in the detail sheet as well

### 4. Rename "Upload CSV" button to "Upload" in the estimate detail sheet
**File: `src/pages/SupplierProjectEstimates.tsx`**

Change the button label from "Upload CSV" to "Upload" (line ~576).

### 5. Update AI prompt to extract pricing as a total estimate amount
**File: `supabase/functions/parse-estimate-pdf/index.ts`**

Update the `SYSTEM_PROMPT` and `EXTRACT_TOOL` schema:
- Instruct AI to extract the **grand total / estimate total** from the document (not per-item pricing)
- Add an `estimate_total` field to the tool's return schema (a single number)
- Keep individual items without pricing (SKU, description, qty, UOM only)
- The returned `estimate_total` will be saved to `supplier_estimates.total_amount` after parsing

### 6. Save the extracted total to the estimate record
**File: `src/components/estimate-upload/EstimateUploadWizard.tsx`** (or `PdfUploadStep.tsx`)

After the AI returns `estimate_total`, pass it through the flow and update `supplier_estimates.total_amount` with the extracted value when saving.

## Technical Details

### Files Modified

- **`src/pages/SupplierProjectEstimates.tsx`**
  - Swap field order in Create dialog (project first, name second)
  - After create, auto-open upload wizard with the new estimate ID
  - Change "Upload CSV" label to "Upload"

- **`src/components/estimate-upload/EstimateUploadWizard.tsx`**
  - Pass `projectName` and `estimateName` as props, display them at the top of the dialog header
  - Remove the `choose` step -- start directly on a unified upload step that accepts PDF or CSV
  - Accept and forward `estimate_total` from parsed results to save on the estimate record

- **`src/components/estimate-upload/PdfUploadStep.tsx`**
  - Update helper text: remove "Pricing data is excluded" -- replace with "AI will extract items and total pricing"

- **`supabase/functions/parse-estimate-pdf/index.ts`**
  - Update SYSTEM_PROMPT: instruct AI to also extract the document's grand total / estimate total as a single number
  - Add `estimate_total` (number, nullable) to the `EXTRACT_TOOL` schema
  - Return `estimate_total` alongside packs in the response

### Flow After Changes

```text
Supplier clicks "New Estimate"
  --> Dialog: Select Project (first), Enter Estimate Name (second)
  --> Clicks "Create"
  --> Estimate created in DB
  --> Upload Wizard opens immediately (no detail sheet)
  --> Shows: "Project Name" and "Estimate Name" at top
  --> Unified upload area (PDF drag-drop or file picker, accepts .pdf and .csv)
  --> AI extracts items + grand total from PDF
  --> Pack review step
  --> Catalog matching step
  --> Save items + total_amount to estimate
```
