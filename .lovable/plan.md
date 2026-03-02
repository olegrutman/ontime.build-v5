
# GC Estimates Page: Match Supplier View

## Problem
The GC (material-responsible party) sees a different, simpler estimates view (`ProjectEstimatesReview`) that lacks pricing details (unit price, line totals, tax, pack subtotals). The supplier sees the rich `EstimateSummaryCard` with full financial breakdown. They should look identical.

## Solution
Refactor `ProjectEstimatesReview` to use the same `EstimateSummaryCard` component that the supplier sees, while keeping the GC's approve/reject actions.

## Changes

### File: `src/components/project/ProjectEstimatesReview.tsx`

**1. Import `EstimateSummaryCard`**
Add import for `EstimateSummaryCard` from `@/components/estimate-summary/EstimateSummaryCard`.

**2. Replace the detail view table (lines ~420-478)**
Currently the right column renders a custom table showing only SKU, Description, Qty, UOM (no pricing). Replace this with:
- The `EstimateSummaryCard` component, passing `items={lineItems}` and `totalWithTax={selectedEstimate.total_amount || 0}`
- This gives the GC the same expandable pack breakdown with pricing that the supplier sees

**3. Always show pricing in the estimate list cards (lines ~318-322)**
Currently pricing is conditionally shown with `canViewEstimates`. Since the GC is the responsible party, pricing should always be visible. Remove the `canViewEstimates` guard on the total_amount display in the left column cards so the amounts always show.

**4. Show pricing in detail header (lines ~390-394)**
Similarly, remove the `canViewEstimates` conditional around the total display in the detail card header.

The overall layout (3-column grid with list on left, detail on right, approve/reject buttons) stays the same. Only the detail content area changes to use `EstimateSummaryCard`.

### No other files changed
- No database changes
- No workflow changes
- No new components needed
