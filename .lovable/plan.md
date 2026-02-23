

# Enable Full Estimate Workflow in Supplier Project Overview

## Goal
Allow suppliers to create, upload, view, and submit estimates directly from the project overview page, matching the same flow available on the "My Estimates" (/supplier/estimates) page.

## Current State
The `SupplierEstimatesSection` on the project page only:
- Creates estimates (name only)
- Lists them with status badges
- Deletes draft estimates

It does NOT allow suppliers to:
- Click into an estimate to see line items
- Upload PDF/CSV files via the EstimateUploadWizard
- Submit estimates for review

All of these features exist on `SupplierProjectEstimates.tsx` but are missing from the in-project section.

## Changes

### Update `src/components/project/SupplierEstimatesSection.tsx`

Add the following capabilities to this existing component:

1. **Estimate Detail Sheet** -- When a supplier clicks an estimate row, open a `Sheet` (slide-over panel) showing:
   - Estimate name, status badge, and total amount
   - Action buttons for DRAFT estimates: Upload, Submit for Review, Delete
   - Line items table grouped by `pack_name` (same layout as the My Estimates page detail sheet)

2. **EstimateUploadWizard integration** -- Wire up the Upload button to open the `EstimateUploadWizard` dialog with the correct `estimateId`, `supplierId`, `projectName`, and `estimateName` props.

3. **Submit for Review** -- Add a Submit button that updates the estimate status to `SUBMITTED` with a timestamp.

4. **Auto-open upload after creation** -- After creating a new estimate, automatically open the upload wizard (same behavior as the My Estimates page).

### Technical Details

**New state variables:**
- `selectedEstimate` -- the estimate currently open in the detail sheet
- `estimateItems` / `loadingItems` -- line items for the selected estimate
- `uploadWizard` state object (open, estimateId, supplierId, projectName, estimateName)

**Data fetching:**
- `fetchEstimateItems(estimateId)` -- queries `supplier_estimate_items` filtered by `estimate_id`, ordered by `created_at`
- Supplier ID lookup: queries `suppliers` table where `organization_id = supplierOrgId` to get the supplier record ID needed by the upload wizard

**New imports:**
- `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle` from ui/sheet
- `EstimateUploadWizard` from estimate-upload
- `Table`, `TableBody`, `TableCell`, `TableHead`, `TableHeader`, `TableRow` from ui/table
- `Send`, `Upload`, `Package` from lucide-react
- `format` from date-fns
- `SupplierEstimateItem`, `ESTIMATE_STATUS_LABELS`, `ESTIMATE_STATUS_COLORS`, `SupplierEstimateStatus` from types/supplierEstimate

**Component structure mirrors `SupplierProjectEstimates.tsx`:**
- Detail sheet with status, total, action buttons
- Items grouped by `pack_name` in a table
- Upload wizard dialog rendered at component level
- Submit updates status to SUBMITTED and invalidates queries

### Files Changed
1. `src/components/project/SupplierEstimatesSection.tsx` -- add detail sheet, upload wizard, submit flow
