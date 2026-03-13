

# Add Estimate-Orders Card with Highlighted Packs to Supplier Estimates Page

## What

Reuse the `SupplierEstimateCatalog` component (or its visual pattern) on the `SupplierEstimates` page to show the same "Estimates → Orders" card with ordered packs highlighted in green.

## Approach

The `SupplierEstimates` page currently fetches its own estimate data but doesn't compute ordered pack info. We need to:

### 1. Fetch PO data to determine ordered packs
**File:** `src/pages/SupplierEstimates.tsx`
- After fetching estimates, also fetch POs with `source_estimate_id` and `source_pack_name` for the supplier's org.
- Build the `orderedPackNames` mapping per estimate (same logic as the dashboard hook).

### 2. Build `EstimateRow[]` from the page's estimate data
- Map the fetched `project_estimates` + `estimate_packs` + PO data into `EstimateRow[]` compatible with `SupplierEstimateCatalog`.

### 3. Render `SupplierEstimateCatalog` on the page
- Import and render the existing `SupplierEstimateCatalog` component above or beside the estimates list, passing the built `EstimateRow[]`.

### Files Changed

| File | Change |
|---|---|
| `src/pages/SupplierEstimates.tsx` | Fetch POs with `source_estimate_id`/`source_pack_name`; build `EstimateRow[]`; render `SupplierEstimateCatalog` component |

