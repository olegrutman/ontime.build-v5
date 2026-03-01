

# Supplier Project Overview: Materials Control Center

## Summary

Replace the current 3-card supplier overview layout with a comprehensive Materials Control Center showing detailed financial metrics (Estimate, Committed, Delivered, Returned, Variances) plus a cumulative materials chart over time.

## Current State

The supplier overview currently shows:
- `SupplierEstimateVsOrdersCard` -- basic estimate vs orders comparison
- `SupplierFinancialsSummaryCard` -- order value, invoiced, paid
- `SupplierPOSummaryCard` -- PO status counts
- `SupplierOperationalSummary` -- work orders, invoices, RFIs, team, scope tiles

## New Components

### 1. `SupplierMaterialsControlCard` (new file)
**File**: `src/components/project/SupplierMaterialsControlCard.tsx`

A single comprehensive card replacing `SupplierEstimateVsOrdersCard` and `SupplierFinancialsSummaryCard`. It displays:

**Data fetched via `useQuery`:**
- **Estimate Total**: Sum of `supplier_estimates.total_amount` where `status = 'APPROVED'` and `supplier_org_id` matches
- **Committed Total**: Sum of PO line_totals where `supplier_id` matches and `status IN ('PRICED','ORDERED','READY_FOR_DELIVERY','FINALIZED','DELIVERED')`
  - **From Estimate**: POs where `source_estimate_id IS NOT NULL`
  - **Additional**: POs where `source_estimate_id IS NULL`
- **Delivered Total**: Sum of PO line_totals where `status = 'DELIVERED'`
- **Returned/Credited**: Sum of `returns.net_credit_total` where `supplier_org_id` matches and `status = 'CLOSED'`
- **Net Delivered**: Delivered Total - Returned Total
- **Committed Variance**: (Committed - Estimate), both $ and %
- **Delivered Variance**: (Net Delivered - Estimate), both $ and %

**Layout**: Clean card with rows for each metric, separator between sections, color-coded variances (green = under, amber/red = over).

### 2. `SupplierMaterialsChart` (new file)
**File**: `src/components/project/SupplierMaterialsChart.tsx`

A recharts `AreaChart` / `LineChart` inside a Card:
- **X-axis**: Time (months, based on PO `created_at` for committed, `delivered_at` for delivered)
- **Y-axis**: Cumulative dollars
- **Lines**:
  - Estimate (flat horizontal reference line)
  - Committed (cumulative over time)
  - Net Delivered (cumulative over time)
- **Forecast banner**: Below the chart, conditionally show:
  - Warning (amber): "Current commitments exceed estimate by $X (+Y%)" if committed > estimate
  - Success (green): "Currently within estimate" otherwise

Uses `recharts` (already installed) with the existing `ChartContainer`/`ChartTooltip` components.

### 3. Update `ProjectHome.tsx` supplier overview layout

Replace the current 3-card grid + `SupplierOperationalSummary` with:
```
<SupplierMaterialsControlCard />        (full width or 2-col span)
<SupplierMaterialsChart />              (full width)
<SupplierPOSummaryCard />               (keep -- operational PO status tracking)
<SupplierOperationalSummary />          (keep -- WOs, invoices, RFIs, team, scope)
```

Remove `SupplierEstimateVsOrdersCard` and `SupplierFinancialsSummaryCard` from the layout (their data is now in the new control card).

## Technical Details

### Database queries (all read-only, no schema changes)

**Estimate Total:**
```sql
SELECT SUM(total_amount) FROM supplier_estimates
WHERE project_id = X AND supplier_org_id = Y AND status = 'APPROVED'
```

**Committed Total (with from-estimate split):**
```sql
-- All committed POs
SELECT id, source_estimate_id, po_line_items(line_total)
FROM purchase_orders
WHERE project_id = X AND supplier_id = Z
  AND status IN ('PRICED','ORDERED','READY_FOR_DELIVERY','FINALIZED','DELIVERED')
```
Split client-side by `source_estimate_id` null vs not-null.

**Delivered Total:**
```sql
SELECT po_line_items(line_total)
FROM purchase_orders
WHERE project_id = X AND supplier_id = Z AND status = 'DELIVERED'
```

**Returns:**
```sql
SELECT SUM(net_credit_total) FROM returns
WHERE project_id = X AND supplier_org_id = Y AND status = 'CLOSED'
```

**Chart data (cumulative over time):**
```sql
SELECT created_at, status, delivered_at, po_line_items(line_total)
FROM purchase_orders
WHERE project_id = X AND supplier_id = Z
  AND status IN ('PRICED','ORDERED','READY_FOR_DELIVERY','FINALIZED','DELIVERED')
ORDER BY created_at
```
Aggregate into monthly buckets client-side and compute running totals.

### Files Modified
1. **`src/components/project/SupplierMaterialsControlCard.tsx`** -- NEW
2. **`src/components/project/SupplierMaterialsChart.tsx`** -- NEW
3. **`src/pages/ProjectHome.tsx`** -- Replace supplier overview grid layout
4. **`src/components/project/index.ts`** -- Add exports for new components

### Files NOT Changed
- `SupplierPOSummaryCard.tsx` -- kept as-is (operational status tracking)
- `SupplierOperationalSummary.tsx` -- kept as-is (WOs, invoices, RFIs, team)
- `SupplierEstimateVsOrdersCard.tsx` -- removed from layout but file kept (no deletion)
- `SupplierFinancialsSummaryCard.tsx` -- removed from layout but file kept
- No database migrations needed
- No business logic changes

