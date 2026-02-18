

# Show Estimate Sum vs Orders on Supplier Overview

## What Changes

When a supplier views a project's Overview tab, add a new **"Estimates vs Orders"** comparison card that shows:
- **Total Estimates**: Sum of `total_amount` from `supplier_estimates` for this project/supplier org
- **Total Orders (POs)**: Sum of finalized PO line totals (already calculated in `SupplierFinancialsSummaryCard`)
- **Difference**: Visual indicator showing how estimates compare to actual orders (over/under)

## Implementation

### 1. New Component: `SupplierEstimateVsOrdersCard`
**File: `src/components/project/SupplierEstimateVsOrdersCard.tsx`**

A card component that:
- Queries `supplier_estimates` for this project + supplier org, summing `total_amount` (for APPROVED and SUBMITTED statuses)
- Queries `purchase_orders` with `po_line_items` for finalized/delivered POs for this supplier
- Displays:
  - Estimate Total
  - Order Total (finalized POs)
  - Difference (with color coding: green if orders match/exceed, amber if under)
  - A simple progress bar showing orders as a percentage of estimates

### 2. Update Supplier Overview in ProjectHome
**File: `src/pages/ProjectHome.tsx`**

In the overview tab, when `isSupplier` is true, render the new `SupplierEstimateVsOrdersCard` alongside the existing `SupplierFinancialsSummaryCard` and `SupplierPOSummaryCard` in a grid layout. This replaces the generic financial components (FinancialSignalBar, FinancialHealthCharts, OperationalSummary) that aren't relevant to suppliers.

### 3. Export
**File: `src/components/project/index.ts`**

Add export for the new component.

## Technical Details

- The `supplier_estimates` table has `total_amount`, `project_id`, `supplier_org_id`, and `status` fields
- PO totals are derived from `po_line_items.line_total` on finalized POs, same pattern as `SupplierFinancialsSummaryCard`
- Supplier org ID lookup uses `suppliers` table (org_id to supplier_id mapping), same pattern as existing supplier cards
- Uses `@tanstack/react-query` for data fetching, consistent with existing components
