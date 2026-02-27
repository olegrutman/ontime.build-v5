

# Update Supplier Estimates vs Orders Card and Material Estimate vs Orders Chart

## What Changes

### 1. Supplier Estimate vs Orders Card (Supplier view)
**Current:** Sums PO line item totals (subtotal * tax) for FINALIZED/DELIVERED POs.
**New:** Show the total number of POs and their aggregate value using the PO-level total (simple count + sum), making it a cleaner "list total" rather than computing from line items. Also include PO statuses beyond just FINALIZED/DELIVERED -- show all non-draft POs (SUBMITTED, PRICED, ORDERED, READY_FOR_DELIVERY, FINALIZED, DELIVERED).

### 2. Material Estimate vs Orders Chart (GC/TC view)
**Current:** Shows `materialEstimate` (from project contract's `material_estimate_total` or WO material totals) vs `materialOrdered` (PO line item sums). Label says "Material Estimate vs Orders".
**New:** Rename to "Material Budget vs Orders" and use the material budget/estimate value from the project contract (`material_estimate_total` or approved supplier estimate sum as fallback) vs PO totals. The data source is already correct (`materialEstimate` in `useProjectFinancials` already resolves to the material budget), but the labeling will be updated to clarify it's the budget being compared.

## Technical Details

### File: `src/components/project/SupplierEstimateVsOrdersCard.tsx`
- Change PO query to use broader statuses: `SUBMITTED`, `PRICED`, `ORDERED`, `READY_FOR_DELIVERY`, `FINALIZED`, `DELIVERED` (exclude only `ACTIVE` which is draft)
- Simplify total calculation: sum `po_line_items(line_total)` subtotals without tax multiplier (show raw order value to match estimate comparison)
- Keep the rest of the card layout the same

### File: `src/components/project/FinancialHealthCharts.tsx`
- Rename chart title from "Material Estimate vs Orders" to "Material Budget vs Orders"
- Rename the "Estimate" bar label to "Budget"
- Update the over-budget warning text to say "Orders exceed budget" instead of "Orders exceed estimate"

No changes needed to `useProjectFinancials.ts` -- the data sources are already correct.
