

# Bugs Found: TC Still Sees Pricing in Multiple Places

## Issues Identified

### Bug 1: `POActionBar` — always shows dollar totals
The action bar (3 metric cards at top of PO tab) shows `formatCurrency(metrics.needsActionTotal)`, `formatCurrency(metrics.awaitingTotal)`, and `formatCurrency(metrics.deliveredTotal)` unconditionally. No `hidePricing` prop exists on this component.

**Fix:** Add `hidePricing?: boolean` prop to `POActionBar`. When true, show only counts (e.g., "3") without the parenthetical dollar amount.

### Bug 2: `PODetail` — uses `usePOPricingVisibility` without TC override
`PODetail` determines `canViewPricing` via `usePOPricingVisibility`, which checks `pricing_owner_org_id === userOrgId`. When GC is material-responsible, `pricing_owner_org_id` is the GC org — so TC correctly gets `false` from the hook. However, there's a secondary check: the hook also grants visibility if TC is the *supplier* (which shouldn't apply here). More importantly, the hook does NOT know about the `material_responsibility` context. If `pricing_owner_org_id` happens to equal the TC org (edge case), pricing leaks.

**Fix:** Add `hidePricingOverride?: boolean` prop to `PODetail`. When true, force `canViewPricing = false` regardless of hook result. Pass it from `PurchaseOrdersTab` where `hidePricing` is already computed.

### Bug 3: `POSummaryCard` — shows financial totals to TC
The project overview card (`POSummaryCard`) independently fetches POs and shows "Supplier Cost", "Markup", "Total Revenue" for TC view. It uses its own `canViewPricing` logic (`!isFCView`) which does NOT check `material_responsibility`.

**Fix:** In `POSummaryCard`, fetch `material_responsibility` from `project_contracts`. Set `canViewPricing = false` when TC and `material_responsibility === 'GC'`.

### Bug 4: `POTableView` — Total column shows "—" correctly but only because `canViewPricing` callback works
No bug here — it already uses the `canViewPricing(po)` callback from `PurchaseOrdersTab` which returns `false` when `hidePricing` is true. Confirmed working.

---

## Changes

| File | Change |
|---|---|
| `src/components/purchase-orders/POActionBar.tsx` | Add `hidePricing` prop; hide dollar amounts when true |
| `src/components/project/PurchaseOrdersTab.tsx` | Pass `hidePricing` to `POActionBar` and `PODetail` |
| `src/components/purchase-orders/PODetail.tsx` | Add `hidePricingOverride` prop; override `canViewPricing` when true |
| `src/components/project/POSummaryCard.tsx` | Fetch `material_responsibility`; hide financials for TC when GC is buyer |

