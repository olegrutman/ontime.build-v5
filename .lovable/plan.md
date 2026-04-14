

# Hide TC Markup Details from GC View

## Problem
When GC views a TC-created work order, they see the TC's internal pricing breakdown:
- "Unit cost" column showing $15.00
- "Markup %" column showing 20%
- Footer showing Cost ($4,410.00) and Markup (+$882.00) separately

GC should only see the final billed amount ($5,292.00) — the markup details are TC-internal.

## Fix

**`src/components/change-orders/COMaterialsPanel.tsx`**

1. **Hide Unit cost and Markup % columns for GC** (lines 755-756): Only show these two columns for TC (not GC). The "Amount" column stays visible for everyone.

2. **Hide Cost/Markup footer breakdown for GC** (lines 947-957): The "Cost" and "Markup" subtotal rows should only render for TC, not GC. GC only sees the "Total" line.

3. **Keep the Amount column visible for GC**: GC still sees Description, Qty, UOM, and the final Amount.

Specifically:
- Line 755: Change `{showPricingColumns && ...}` to `{showPricingColumns && !isGC && ...}` for "Unit cost" header
- Line 756: Same for "Markup %" header  
- Lines 780-807: Wrap the unit cost and markup cells with `!isGC` guard
- Lines 947-957: Wrap the Cost and Markup footer rows with `!isGC`

One file, ~6 line changes. GC sees only quantities and final amounts.
