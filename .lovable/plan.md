

# Show Estimate Details Directly on Page with Auto-Calculated Tax

## What You Asked For (Plain English)

You want the estimate details (summary, packs, items, pricing) shown directly on the estimate page -- not hidden behind a clickable tile that opens a side panel. And the tax should be fully automatic: we already know the subtotal (from the items) and the total (from the PDF upload), so we can calculate the tax amount and tax percentage ourselves. Nothing about tax should be editable.

## Changes

### 1. Update EstimateSummaryCard to remove all editable tax/total fields

**File:** `src/components/estimate-summary/EstimateSummaryCard.tsx`

- Remove the editable tax % input and the editable total input
- Accept a new prop: `totalWithTax` (the `total_amount` from the estimate, i.e. the grand total extracted from the PDF)
- Auto-calculate:
  - `taxAmount = totalWithTax - subtotal`
  - `taxPercent = (taxAmount / subtotal) * 100`
- Display all values as read-only text: Subtotal, Tax % (auto-calculated), Tax Amount, Total (incl. tax)
- Remove the `onTaxUpdate`, `estimateId`, and `salesTaxPercent` props since nothing is editable anymore
- Keep the expandable pack breakdown with item details (already implemented)

### 2. Show estimate details inline on SupplierProjectEstimates page (not in a Sheet)

**File:** `src/pages/SupplierProjectEstimates.tsx`

- When user clicks an estimate card, instead of opening a Sheet, navigate to a detail view within the page (or show it inline below the list)
- Remove the `<Sheet>` component for estimate details
- Show the estimate header (name, status, project, actions) and the `EstimateSummaryCard` directly in the main content area
- Pass `totalWithTax={selectedEstimate.total_amount}` to `EstimateSummaryCard`

### 3. Same change for SupplierEstimatesSection

**File:** `src/components/project/SupplierEstimatesSection.tsx`

- Remove the Sheet-based detail view
- Show EstimateSummaryCard inline within the card when items are loaded
- Pass `totalWithTax={estimate.total_amount}` instead of `salesTaxPercent`

### 4. Auto-save calculated tax % on upload (optional cleanup)

**File:** `src/components/estimate-upload/EstimateUploadWizard.tsx`

- After saving items and the estimate total, also compute and save `sales_tax_percent` to the database so it's available for reporting:
  - `subtotal = sum of all item line totals`
  - `taxPercent = ((estimateTotal - subtotal) / subtotal) * 100`
  - Save alongside `total_amount`

## Technical Summary

| File | Change |
|------|--------|
| `EstimateSummaryCard.tsx` | Remove editable inputs; accept `totalWithTax` prop; auto-calculate tax amount and % as read-only |
| `SupplierProjectEstimates.tsx` | Replace Sheet with inline detail view; pass `totalWithTax` |
| `SupplierEstimatesSection.tsx` | Replace Sheet with inline detail; pass `totalWithTax` |
| `EstimateUploadWizard.tsx` | Auto-save computed `sales_tax_percent` on upload |

