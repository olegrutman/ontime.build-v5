

# Add Estimates → Orders Card to Supplier Project Overview

## What

Move the `SupplierEstimateCatalog` card from the Supplier Estimates page to the Supplier Project Overview tab (`SupplierMaterialsOverview` component). Since this is on a per-project page, we'll filter estimates to only the current project.

## Plan

### 1. Add estimate-order data fetching to `SupplierMaterialsOverview`
**File:** `src/components/project/SupplierMaterialsOverview.tsx`

- Import `SupplierEstimateCatalog` and `EstimateRow` type.
- Add a `useQuery` (or inline `useEffect`) that fetches `supplier_estimates` for the given `projectId` + `supplierOrgId`, plus their items (for pack names) and POs (for ordered status) — same logic as `fetchEstimateOrderRows` in `SupplierEstimates.tsx` but filtered to the single project.
- Build `EstimateRow[]` with `orderedPackNames`.
- Render `<SupplierEstimateCatalog estimates={rows} />` at the bottom of the overview (after Risk Factors section), or in the two-column grid alongside an existing card.

### 2. Optionally remove from SupplierEstimates page
Only if user confirms — for now, keep it in both places.

### Files Changed

| File | Change |
|---|---|
| `src/components/project/SupplierMaterialsOverview.tsx` | Fetch estimate+PO data for current project; render `SupplierEstimateCatalog` card |

