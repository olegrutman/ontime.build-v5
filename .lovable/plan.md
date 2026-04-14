

# Restore FC's Own Numbers on Work Order Detail

## Problem
The previous change over-corrected by hiding ALL financial data from FC — including the FC's own labor totals, pricing badges, and profitability. The FC should see their own numbers; they should NOT see TC's numbers.

## What the FC should see
- Their own line item totals (fcTotal) and "Priced" badges on scope items
- Their own margin badges on line items
- Their own profitability in the sidebar (FC Revenue, FC Internal Costs, FC Gross Margin)
- KPI strip already correct — no change needed there

## Changes

### 1. `src/components/change-orders/COLineItemRow.tsx`
- **Line 156**: Remove `!isFC &&` — restore the Priced/Needs Pricing badge for FC (these reflect FC's own entries)
- **Line 166**: Remove `!isFC &&` — restore the dollar total display for FC (this shows `fcTotal`, the FC's own billable)
- Internal cost pill (line 171) stays `isTC` only — correct as-is

### 2. `src/components/change-orders/COSidebar.tsx`
- **Line 157**: Change `isTC` back to `(isTC || isFC)` — restore FC Profitability section showing FC's own revenue, costs, and margin

Two files, two surgical reversals. The FC sees their own money, not the TC's.

