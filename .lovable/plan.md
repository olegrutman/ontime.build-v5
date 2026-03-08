

# Math Formula Audit — Bug Report

After reviewing all financial calculation logic across the app, here are the bugs found:

---

## Bug 1: `WorkOrderSummaryCard` — TC profit sums ALL work orders (including drafts)

**File:** `src/components/project/WorkOrderSummaryCard.tsx`, lines 182-184

The loop sums `tcToGcTotal` across **all** work orders regardless of status (draft, rejected, etc.). Only approved/contracted WOs should count as revenue.

```ts
// Current (WRONG) — sums everything
for (const wo of workOrders || []) {
  const total = enrichedTotals.get(wo.id) || wo.final_price || 0;
  tcToGcTotal += total;  // includes drafts, rejected, etc.
}
```

**Fix:** Filter to `approved`/`contracted` before summing.

---

## Bug 2: `WorkOrderSummaryCard` — TC profit ignores self-performing internal cost

**File:** `src/components/project/WorkOrderSummaryCard.tsx`, line 243

```ts
const profit = totals.tcToGcTotal - totals.tcToFcTotal;
```

When TC is self-performing, `tcToFcTotal = 0` (no FC hours), so profit = revenue (100% margin). Should subtract `tc_internal_cost` for self-performing WOs.

**Fix:** Fetch and sum `tc_internal_cost` from self-performing WOs alongside FC hours. `profit = revenue - fcCost - internalCost`.

---

## Bug 3: `useDashboardData` — TC dashboard profit ignores internal cost

**File:** `src/hooks/useDashboardData.ts`, lines 536-542

Same issue at the dashboard level. Only fetches `change_order_fc_hours` for costs. Self-performing WOs with `tc_internal_cost` are invisible, showing inflated profit.

**Fix:** Also sum `tc_internal_cost` from `change_order_projects` for WOs without FC participants and add to `totalCosts`.

---

## Bug 4: `useProjectFinancials` — `woEquipmentTotal` derived from mismatched sources

**File:** `src/hooks/useProjectFinancials.ts`, line 390

```ts
setWoEquipmentTotal(Math.max(0, woTotal - woLabor - woMaterial));
```

`woTotal` comes from `enrichWorkOrderTotals` (recalculates materials from PO line items + markup), while `woLabor` and `woMaterial` come from raw DB fields (`labor_total`, `material_total`). The mismatch means equipment total absorbs the difference between stale DB material values and enriched material values, producing incorrect numbers.

**Fix:** Fetch `equipment_total` from the WO query (currently not selected — line 207 is missing it) and sum directly: `setWoEquipmentTotal(approvedWOs.reduce(...wo.equipment_total...))`.

---

## Bug 5: `ContractedPricingCard` — TC revenue uses potentially stale `final_price`

**File:** `src/components/change-order-detail/ContractedPricingCard.tsx`, line 367

```ts
const revenue = finalPrice;  // = changeOrder.final_price || 0
```

`final_price` can be stale or zero (it's a snapshot field). But `laborTotal`, `materialTotal`, `equipmentTotal` are already recalculated correctly above. Revenue should use the recalculated sum for consistency.

**Fix:** `const revenue = laborTotal + materialTotal + equipmentTotal;`

---

## Bug 6: `ProfitCard` — TC labor margin doesn't include aggregated `tc_internal_cost`

**File:** `src/components/project/ProfitCard.tsx`, line 141

```ts
const laborMargin = revenueTotal - fcContractValue - workOrderFCCost - estimateCost;
```

For self-performing WOs, `workOrderFCCost = 0`. The aggregated `tc_internal_cost` across all WOs is never fetched by `useProjectFinancials`, so it's not subtracted from margin.

**Fix:** Add `tcInternalCostTotal` to `useProjectFinancials` (sum of `tc_internal_cost` from WOs without FC participants). Then: `laborMargin = revenueTotal - fcContractValue - workOrderFCCost - tcInternalCostTotal - estimateCost`.

---

## Bug 7: `useDashboardData` — WO revenue only counts `contracted`, misses `approved`

**File:** `src/hooks/useDashboardData.ts`, line 530-532

```ts
totalWorkOrderValue = woList
  .filter(wo => wo.status === 'contracted')
  .reduce((sum, wo) => sum + (wo.final_price || 0), 0);
```

The query fetches both `approved` and `contracted` WOs, but revenue only sums `contracted`. This understates WO revenue on the dashboard.

**Fix:** Include both `approved` and `contracted` in the revenue sum.

---

## Summary of Fixes

| # | Location | Issue | Severity |
|---|----------|-------|----------|
| 1 | WorkOrderSummaryCard | Sums all WO statuses as revenue | High |
| 2 | WorkOrderSummaryCard | Missing tc_internal_cost in profit | Medium |
| 3 | useDashboardData | Missing tc_internal_cost in dashboard profit | Medium |
| 4 | useProjectFinancials | Equipment total derived from mismatched sources | Medium |
| 5 | ContractedPricingCard | Revenue uses stale final_price | Medium |
| 6 | ProfitCard | Missing aggregated tc_internal_cost | Medium |
| 7 | useDashboardData | WO revenue excludes approved status | Medium |

## Files to Edit
- `src/components/project/WorkOrderSummaryCard.tsx` — Bugs 1, 2
- `src/hooks/useDashboardData.ts` — Bugs 3, 7
- `src/hooks/useProjectFinancials.ts` — Bugs 4, 6 (add equipment_total to query, add tcInternalCostTotal)
- `src/components/change-order-detail/ContractedPricingCard.tsx` — Bug 5
- `src/components/project/ProfitCard.tsx` — Bug 6 (consume new field)

