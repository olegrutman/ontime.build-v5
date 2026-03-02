
# Add Materials Budget Status Card to GC/TC Overview

## Overview
Add a compact, clickable "Materials Budget Status" card to the GC/TC project overview page. When clicked, it opens a dialog with full drilldown details. Only visible to the material-responsible party.

## New Files

### 1. `src/hooks/useMaterialsBudgetHealth.ts`
A new hook similar to `useSupplierMaterialsOverview` but queries from the GC/TC perspective (all suppliers on the project, not scoped to one supplier org).

Key differences from the supplier hook:
- Fetches ALL approved `supplier_estimates` for the project (no org filter)
- Fetches ALL POs for the project (no supplier filter)
- Fetches ALL closed returns for the project
- Same forecast logic (weighted pack delta), same computed values
- Returns the same shape: `estimateTotal`, `materialsOrdered`, `deliveredNet`, `forecastFinal`, `forecastVariance`, `forecastVariancePct`, `forecastConfidence`, `packsOverBudget` (top 5), `unmatchedItems` (top 5), `riskFactors`, `chartData`

### 2. `src/components/project/MaterialsBudgetStatusCard.tsx`
Two parts: collapsed card + expanded dialog.

**Collapsed Card** (placed in the left column of the overview grid):
- Title: "Materials Budget Status"
- Four metric rows: Budget (Estimate), Materials Ordered (+/- %), Materials Delivered Net (+/- %), Projected Final Cost (+/- %)
- Status line with color: "On Budget" (green) / "Trending Over Budget" (amber/red) / "Trending Under Budget" (green)
- Small inline sparkline (tiny recharts LineChart, ~60px tall) showing estimate baseline, ordered trend, delivered trend
- Entire card is clickable (cursor-pointer, hover:shadow-md)

Color logic:
- Green: forecastFinal <= estimateTotal
- Amber: forecastFinal > estimateTotal and <= 5% over
- Red: forecastFinal > 5% over estimateTotal

**Expanded Dialog** (opens on card click):
Uses the existing `Dialog` component. Contains 5 sections:

1. **Forecast Summary**: Projected Final Cost, Over/Under $, Over/Under %, Confidence indicator
2. **Budget vs Actual Chart**: Full-width LineChart with Budget baseline, Ordered cumulative, Delivered cumulative lines
3. **Top 5 Packs Over Budget**: Table with Pack Name, Budget, Ordered, Over/Under columns
4. **Top 5 Materials Not in Estimate**: Table with Item, Ordered Cost, # POs, First Seen
5. **Risk Factors**: Same bullet list as supplier dashboard (unpriced items, packs not started, biggest upcoming)

## Modified Files

### `src/pages/ProjectHome.tsx`
- Import `MaterialsBudgetStatusCard`
- Add it to the left column of the GC/TC overview, after the `BillingCashCard / BudgetTracking` row and before `CollapsibleOperations`
- Only render when user is material-responsible: `(viewerRole === 'GC' && financials.isGCMaterialResponsible) || (viewerRole === 'TC' && financials.isTCMaterialResponsible)`
- Uses `materialResponsibility` state already available in the page

### `src/components/project/index.ts`
- Add export for `MaterialsBudgetStatusCard`

## Technical Details

The hook queries:
```text
supplier_estimates: project_id = X, status = 'APPROVED' -> sum total_amount
supplier_estimate_items: grouped by pack_name -> estimate per pack
purchase_orders: project_id = X, status IN (PRICED, ORDERED, DELIVERED) -> with po_line_items
returns: project_id = X, status = 'CLOSED' -> sum net_credit_total
```

Forecast formula (same as supplier dashboard):
```text
For each ordered pack: delta_pct = (actual - estimate) / estimate
weighted_avg = SUM(delta_pct * weight)
forecastFinal = orderedTotal + remainingEstimate * (1 + weighted_avg)
```

Sparkline: A tiny `LineChart` (~60px height, no axes, no grid) with 3 lines showing cumulative budget/ordered/delivered trend data from `chartData`.

## Files Summary

| File | Action |
|------|--------|
| `src/hooks/useMaterialsBudgetHealth.ts` | Create - data hook for GC/TC materials health |
| `src/components/project/MaterialsBudgetStatusCard.tsx` | Create - card + dialog component |
| `src/components/project/index.ts` | Edit - add export |
| `src/pages/ProjectHome.tsx` | Edit - add card to overview layout |
