

# Fix 5 Bugs in Work Order Detail Page

## Bugs Found

| # | Bug | Location | Impact |
|---|-----|----------|--------|
| 1 | FC Pricing Toggle writes price to DB but never refreshes queries | `FCPricingToggleCard.tsx` useEffect | KPI and sidebar show $0 even though price is calculated — **this is the screenshot bug** |
| 2 | FC KPI tiles use combined actual costs (TC+FC) instead of FC-only | `COKPIStrip.tsx` lines 96, 112, 117, 119-120 | FC sees TC's internal costs in their margin — privacy violation |
| 3 | Header strip gross margin computed from unfiltered labor entries | `CODetailLayout.tsx` lines 186-189 | TC scope card margin mixes TC and FC actual costs |
| 4 | Divide-by-zero in FC margin badge | `COKPIStrip.tsx` line 120 | Shows `NaN%` when FC has costs but no billable entries |
| 5 | useEffect has no dep guard against redundant DB writes | `FCPricingToggleCard.tsx` line 58-67 | Fires on every re-render when price hasn't changed |

## Changes

### 1. `src/components/change-orders/FCPricingToggleCard.tsx`
- Add `onRefresh()` call after successful DB write in the useEffect — this invalidates queries so the sidebar and KPI tiles update immediately
- Add a ref to track last-written price to prevent redundant writes on re-renders

### 2. `src/components/change-orders/COKPIStrip.tsx`
- Change FC "Internal Cost" tile from `financials.actualCostTotal` → `financials.fcActualCostTotal`
- Change FC margin calc from `financials.fcLaborTotal - financials.actualCostTotal` → `financials.fcLaborTotal - financials.fcActualCostTotal`
- Guard margin percentage with `fcLaborTotal > 0` to prevent NaN

### 3. `src/components/change-orders/CODetailLayout.tsx`
- Replace local `actualCostTotal` calculation with role-aware values from `financials`
- TC sees: `totalLogged` (all billable) vs `financials.tcActualCostTotal`
- Keep `totalLogged` as-is for the progress bar (it's already hidden from FC)

Four files touched, five bugs fixed. The main visible fix: the toggle card will now refresh the page after writing the calculated price, so KPI tiles and sidebar update instantly.

