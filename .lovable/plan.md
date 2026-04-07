

# KPI Card Audit Report — All Roles

## Summary

Audited all KPI cards across Dashboard views (GCDashboardView, TCDashboardView, FCDashboardView, SupplierDashboardView), Project Overview (ProjectFinancialCommand), CO detail (COKPIStrip), Invoice action bar, and the platform admin defaults (defaultKpiConfig.ts). Found 7 bugs ranging from incorrect formulas to missing data sources.

---

## Bug 1: GC `totalRevenue` falls back to `totalCosts` when no owner_contract_value is set
**Severity: High** | **File:** `useDashboardData.ts` lines 680-688

When no `owner_contract_value` exists on any contract, the code sets `totalRevenue = totalCosts`. This means the GC Profit Margin card shows $0 margin and 0% — misleading. It should show the sum of `contract_sum` values (TC contracts flowing to GC) as the revenue baseline, not equal it to costs.

**Fix:** Change fallback from `totalRevenue = totalCosts` to `totalRevenue = totalContractValue` (the sum already computed at line 628-639).

---

## Bug 2: GC `totalContractValue` and `totalCosts` use same filter — always identical
**Severity: High** | **File:** `useDashboardData.ts` lines 628-639 vs 674-678

`totalContractValue` sums contracts where `to_org_id === currentOrg.id`. `totalCosts` (GC path, line 674-678) also sums contracts where `to_org_id === currentOrg.id`. These are always equal. But GC costs should be contracts where GC is the *payer* (to_org), while GC revenue should be derived from `owner_contract_value` or the upstream contract sum. The current logic conflates them.

**Fix:** GC `totalCosts` should sum contracts where GC is `to_org_id` (correct — this is what TCs charge GC). GC `totalRevenue` should prefer `owner_contract_value` and fall back to a distinct revenue source, not the same sum. The fallback at line 687 (`totalRevenue = totalCosts`) makes every metric derived from revenue vs costs yield 0.

---

## Bug 3: TC `totalRevenue` uses `from_org_id` but `totalContractValue` uses `to_org_id`
**Severity: Medium** | **File:** `useDashboardData.ts` lines 629 vs 663-664

For TC: `totalContractValue` (line 629) sums where `to_org_id === currentOrg.id` (contracts where TC receives money — wrong, TC receives money via `from_org_id`). Meanwhile `totalRevenue` (line 664) correctly uses `from_org_id === currentOrg.id`. The `totalContractValue` isn't displayed directly, but it's inconsistent and could cause confusion if used elsewhere.

**Fix:** Align `totalContractValue` for TC to use `from_org_id`.

---

## Bug 4: TC Materials Forecast always shows 4% variance (hardcoded)
**Severity: Medium** | **File:** `DashboardKPIs.tsx` lines 33-35

```typescript
const forecastVariance = financials.totalCosts > 0 
  ? ((financials.totalCosts * 1.04 - financials.totalCosts) / financials.totalCosts) * 100 
  : 0;
```

This always equals exactly 4.0% — it's `(totalCosts * 0.04) / totalCosts * 100 = 4`. The formula doesn't compare actual material spend vs budget. It should use real PO totals vs the material estimate baseline.

**Note:** The expandable TCDashboardView doesn't use this component (it has its own cards), so this only affects the legacy `DashboardKPIs` component. However, it's still referenced and could be rendered in some paths.

**Fix:** Either remove this legacy card or wire it to real material data from the hook.

---

## Bug 5: FC Dashboard `costs` from `projectFinancials` is always 0
**Severity: Medium** | **File:** `useDashboardData.ts` lines 741-743

For FC, per-project costs are set from contracts where `from_org_id === currentOrg.id` — but that maps to `pf.revenue`, not `pf.costs`. The FC path only sets `pf.revenue` and never sets `pf.costs`. So on the FC dashboard, "Internal Cost Budget" in the expanded cards always shows $0.

At the aggregate level (line 698-701), `totalCosts` uses `labor_budget` from the contract, which may be null. If null, FC costs = 0 and margin = 100%.

**Fix:** For FC aggregate costs, fall back to 0 gracefully and add a "No budget set" indicator. For per-project, add FC cost logic to the `pfMap` loop.

---

## Bug 6: FC CO Additions value always $0 in FCDashboardView
**Severity: Medium** | **File:** `FCDashboardView.tsx` lines 240-241

```typescript
const approvedCOs = coList.filter(d => ['approved', 'contracted', 'completed'].includes(d.status));
const coTotal = approvedCOs.reduce((s, d) => s + (d.amount || 0), 0);
```

Change orders in `recentDocs` have `amount: null` (line 547 of useDashboardData.ts — `amount: null` for all COs). So `coTotal` is always 0. The CO amount isn't fetched from the database for the recentDocs CO entries.

**Fix:** Fetch CO estimated amounts when building recent docs, or query `change_order_estimates` to get the approved total.

---

## Bug 7: `CreateInvoiceFromSOV` missing forwardRef (console error)
**Severity: Low** | **File:** `src/components/invoices/CreateInvoiceFromSOV.tsx`

Console shows "Function components cannot be given refs" for `CreateInvoiceFromSOV`. Same pattern as the COLineItemRow/COSidebar fixes already applied.

**Fix:** Wrap with `React.forwardRef`.

---

## No Issues Found In

- **COKPIStrip** — formulas correctly separate labor, materials, equipment by role. Pulls from `COFinancials` which is computed correctly.
- **ProjectFinancialCommand** — correctly uses `upstreamContract.contract_sum`, `approvedEstimateSum`, and filters costs by org. FC path uses `receivablesCollected` from real invoice data.
- **InvoiceActionBar** — correctly filters by status, computes aging from reference dates.
- **SupplierFinancialsSummaryCard** — correctly queries POs by supplier_id and sums invoices by po_id.
- **defaultKpiConfig.ts** — card keys match the expandable dashboard views. Config is consistent.

---

## Proposed Fixes

| File | Change |
|------|--------|
| `src/hooks/useDashboardData.ts` | Bug 1: Change GC revenue fallback to use contract sums, not costs. Bug 3: Fix TC `totalContractValue` filter. Bug 5: Add FC per-project cost logic. Bug 6: Fetch CO amounts for recentDocs. |
| `src/components/dashboard/DashboardKPIs.tsx` | Bug 4: Remove hardcoded 4% variance or wire to real data. |
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Bug 7: Wrap with `React.forwardRef`. |

