

# Hide Prices on Estimates→Orders Card When TC Isn't Material-Responsible

## Understanding
The `SupplierEstimateCatalog` component is already rendered on the GC/TC project overview. The issue is that it always shows `formatCurrency(est.totalAmount)` — even when the TC isn't the material buyer (i.e., `material_responsibility === 'GC'`). The TC should still see **which packs are ordered** (the green check marks + progress bar), but not the dollar amounts.

## Changes

### 1. `SupplierEstimateCatalog` — add `hidePricing` prop
- Add optional `hidePricing?: boolean` to Props.
- When `hidePricing` is true, hide the `formatCurrency(est.totalAmount)` span (line 50-52).
- Keep pack tags, progress bar, and "X% ordered" text visible regardless.

### 2. `ProjectHome.tsx` — pass `hidePricing` based on material responsibility
- The page already has `materialResponsibility` state and `currentOrg?.type`.
- Pass `hidePricing={currentOrg?.type === 'TC' && materialResponsibility === 'GC'}` to `SupplierEstimateCatalog`.
- GC always sees pricing (they're either the buyer or it's their estimate review). TC only sees pricing when `material_responsibility === 'TC'`.

Two files, minimal changes.

