

# Add Work Order Financials to TC Overview

## Current State
The TC overview shows main contract cards (GC contract, FC contract, estimated profit, material costs) but does NOT show work order financial breakdown — even though the `WorkOrderSummaryCard` component calculates this data separately.

## Changes

### File: `src/components/project/ProjectFinancialsSectionNew.tsx`

**1. Add state for FC labor costs (work order level):**
Add a new state variable `workOrderFCCost` to track the total FC labor cost across all work orders.

**2. Fetch FC labor costs in `fetchData`:**
After fetching work order totals (lines 128-134), also query `change_order_fc_hours` to sum up FC labor costs for TC viewers:
```typescript
// After workOrderTotal calculation, if TC:
if (viewerRole === 'Trade Contractor') {
  const woIds = (workOrders || []).map(wo => wo.id);
  if (woIds.length > 0) {
    const { data: fcHours } = await supabase
      .from('change_order_fc_hours')
      .select('labor_total')
      .in('change_order_id', woIds);
    const fcTotal = (fcHours || []).reduce((sum, fc) => sum + (fc.labor_total || 0), 0);
    setWorkOrderFCCost(fcTotal);
  }
}
```

**3. Add Work Order Summary card to TC section (after the Material Costs card, around line 716):**
A new card showing:
- **Work Order Revenue** (TC to GC): sum of `final_price` from all work orders
- **Field Crew Cost** (FC to TC): sum of FC labor from `change_order_fc_hours`
- **Work Order Profit**: Revenue - FC Cost, with margin percentage

```
+----------------------------------+
| Work Orders                      |
| Revenue (TC -> GC):    $10,000   |
| Field Crew Cost:       -$6,000   |
| --------------------------       |
| Work Order Profit:      $4,000   |
|                         (40.0%)  |
+----------------------------------+
```

The card will use a purple left border (matching GC's work order card) with a ClipboardList icon.

### Technical Details
- Reuses the existing `workOrderTotal` state (already fetched) for revenue
- Adds new `workOrderFCCost` state for the FC labor cost
- Only rendered in the `isTCView` section
- Profit is calculated as `workOrderTotal - workOrderFCCost`
- Margin percentage = `(profit / workOrderTotal) * 100`
- Shows `$0` gracefully when no work orders exist (card hidden if `workOrderTotal === 0`)

### Files Modified
- `src/components/project/ProjectFinancialsSectionNew.tsx` — add FC cost state, fetch logic, and Work Order summary card for TC view

