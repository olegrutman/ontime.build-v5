

# Fix GC Labor Cost KPI — Uses Grand Total Instead of Labor Only

## Problem
The GC "Labor Cost" KPI tile incorrectly displays `financials.grandTotal` ($6,229.50) instead of the actual labor-only amount ($650). Then it adds materials and equipment on top again for "Total Cost", causing double-counting.

## Root Cause Analysis

Database values for CO `2fad489a`:
- FC billable labor: $350 (10 hrs x $35/hr)
- TC labor: $0
- `tc_submitted_price`: $650 (snapshotted at submission)
- `use_fc_pricing_base`: true
- Materials billed: $5,292
- Equipment billed: $287.50

Financial computation chain in `useChangeOrderDetail.ts`:
1. `tcLaborTotal` = $0 (no TC entries)
2. `fcLaborTotal` = $350
3. `tcBillableToGC` = $650 (uses `tc_submitted_price` because `use_fc_pricing_base` is true)
4. `grandTotal` = $650 + $5,292 + $287.50 = **$6,229.50**

In `COKPIStrip.tsx` line 44:
```typescript
const laborCost = financials.grandTotal;  // $6,229.50 — WRONG
const totalCost = laborCost + materialCost + equipmentCost;  // double-counts
```

## Fix

**File**: `src/components/change-orders/COKPIStrip.tsx`

Line 44 — change `financials.grandTotal` to `financials.tcBillableToGC`:
```typescript
const laborCost = financials.tcBillableToGC;  // $650 — labor only
```

Line 47 — use `grandTotal` directly instead of re-summing:
```typescript
const totalCost = financials.grandTotal;  // already = labor + mat + equip
```

After fix:
- Labor Cost: **$650**
- Material Cost: **$5,292**
- Equipment Cost: **$287.50**
- Total Cost: **$6,229.50**
- GC Budget: editable

One file, two line changes.

