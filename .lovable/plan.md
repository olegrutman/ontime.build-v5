

# Add "Estimates → Orders" Card to GC/TC Project Overview

## What
Show the `SupplierEstimateCatalog` card on the GC/TC/FC project overview page so these users can see which supplier estimate packs have been ordered. Reuse the same component and data-fetching pattern from `SupplierMaterialsOverview`.

## Changes

### `src/pages/ProjectHome.tsx`
- Import `SupplierEstimateCatalog` and `EstimateRow` type.
- Add a `useQuery` that fetches `supplier_estimates` + their items + POs for the project's supplier org (using existing `projectSupplierOrgId`), building `EstimateRow[]` with `orderedPackNames` and `orderedPercent` — same logic already used in `SupplierMaterialsOverview.tsx`.
- Render `<SupplierEstimateCatalog estimates={rows} />` in the left column of the GC/TC overview, after `MaterialsBudgetStatusCard` (around line 359), gated on `projectSupplierOrgId && estimateRows.length > 0`.

Only one file changes. The data-fetching logic is a copy of the pattern already in `SupplierMaterialsOverview.tsx`.

