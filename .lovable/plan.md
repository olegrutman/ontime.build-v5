

# Material Responsibility Pricing Visibility: Audit Findings & Fix Plan

## Context
When `materials_responsible = 'GC'` on a Work Order, the GC is procuring materials. The TC should NOT see supplier pricing data. The `showPricingColumns` flag on line 184 of `COMaterialsPanel.tsx` correctly hides the price columns. However, several other parts of the same component leak pricing data or allow pricing actions that should be blocked.

## Bugs Found

### Bug 1: TC can create PO pricing requests when GC is material-responsible
**File**: `COMaterialsPanel.tsx` lines 966-1041
**Issue**: The "Supplier pricing" section (Create pricing draft / Send to supplier) renders when `canManageMaterials && !isFC`. This means a TC can create PO pricing requests even when `materialsResponsible === 'GC'`. The TC should not be creating supplier pricing requests for materials the GC is procuring.
**Fix**: Add `&& showPricingColumns` to the condition on line 966, so the entire supplier pricing request section is hidden when TC is not the material-responsible party.

### Bug 2: "Apply supplier pricing" button not gated by showPricingColumns
**File**: `COMaterialsPanel.tsx` lines 993-1003
**Issue**: The "Apply supplier pricing" button checks `hasSupplierPricing && canManageMaterials` but does NOT check `showPricingColumns`. If supplier pricing data somehow exists (e.g., from a previously created PO before the responsibility was set), the TC could apply it.
**Fix**: This is resolved by Bug 1 fix — the entire section will be hidden. But as defense-in-depth, the `applySupplierPricing()` function should also early-return if `!showPricingColumns`.

### Bug 3: Supplier pricing data fetched and stored even when hidden
**File**: `COMaterialsPanel.tsx` lines 236-273
**Issue**: The `fetchSupplierPricing` effect runs whenever a PO is in PRICED status, regardless of `showPricingColumns`. While the UI columns are hidden, the data sits in component state (`supplierPriceMap`) and feeds into computed totals (`totalCost`, `totalBilled`) on lines 196-209. These totals are only displayed behind `showPricingColumns` checks, so the actual leak is minimal, but fetching pricing data the user shouldn't see is a privacy concern.
**Fix**: Gate the fetch effect with `showPricingColumns` — if false, don't fetch and keep the map empty.

### Bug 4: Linked PO link visible to TC when GC-responsible
**File**: `COMaterialsPanel.tsx` lines 991-1013
**Issue**: The "Open linked PO" button is shown whenever `activePricingRequest` exists and the user is not FC. A TC who is not the material-responsible party can still navigate to the linked PO. While PODetail itself does gate pricing via `hidePricingOverride` when accessed through PurchaseOrdersTab, the direct link from the materials panel may bypass this context.
**Fix**: Resolved by Bug 1 fix — the entire section is hidden when `!showPricingColumns`.

### Bug 5: Product picker in COMaterialsPanel passes pricing from estimates
**File**: `COMaterialsPanel.tsx` line 1079
**Issue**: `hidePricing={!showPricingColumns}` — this is actually CORRECT. The picker hides pricing when `showPricingColumns` is false. No bug here, just confirming it works.

## Summary of Changes

| File | Change |
|---|---|
| `COMaterialsPanel.tsx` line 966 | Add `&& showPricingColumns` to supplier pricing section condition |
| `COMaterialsPanel.tsx` lines 236-240 | Gate `fetchSupplierPricing` with `showPricingColumns` |
| `COMaterialsPanel.tsx` `applySupplierPricing()` | Add early-return guard when `!showPricingColumns` |

**One file, three targeted changes.** All changes enforce the existing `showPricingColumns` flag in places where it was missed, ensuring TCs cannot see or interact with supplier pricing when the GC is the material-responsible party.

