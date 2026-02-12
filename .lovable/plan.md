

# Fix TC Dashboard Financial Calculations

## Problem
The TC dashboard Financial Snapshot currently calculates:
- **Revenue**: Main contracts (GC to TC) + contracted work orders -- this is correct
- **Costs**: Only main downstream contracts (TC to FC) -- **missing FC labor costs from work orders**

The user wants:
- **Total Revenue** = Main contract with GC + Work Order revenue (TC to GC)
- **Total Costs** = Main contract with FC + FC labor costs from work orders

## Changes

### File: `src/hooks/useDashboardData.ts`

After fetching work orders (around line 535), add a query to `change_order_fc_hours` to sum up FC labor costs for all contracted work orders:

```typescript
// After work order revenue calculation, fetch FC labor costs for those work orders
if (woList.length > 0) {
  const woIds = woList.map(wo => wo.id);
  const { data: fcHours } = await supabase
    .from('change_order_fc_hours')
    .select('labor_total')
    .in('change_order_id', woIds);
  const fcLaborCost = (fcHours || []).reduce((sum, fc) => sum + (fc.labor_total || 0), 0);
  totalCosts += fcLaborCost;
}
```

This mirrors the same logic already used in `ProjectFinancialsSectionNew.tsx` for the project-level Work Order summary card.

### Result
- Revenue = GC-to-TC contract sum + Work Order `final_price` values
- Costs = TC-to-FC contract sum + Work Order FC labor totals
- Profit = Revenue - Costs (now accurate)

### Files Modified
- `src/hooks/useDashboardData.ts` -- add FC labor cost query to TC financial calculation

