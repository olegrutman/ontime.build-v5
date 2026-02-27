
# Fix Work Order Contract Price to Include Materials

## Problem
The Work Order Summary Card and the individual Work Order cards show `final_price` from the database, which is **$6,170** (labor $5,500 + equipment $670). But the linked PO has **$14,884** in materials that are not reflected. The correct total should be approximately **$21,054**.

This is because `material_total` in the `change_order_projects` table is `$0.00` -- it was never synced from the linked PO line items. The detail page already recalculates from PO data, but the summary views do not.

## Solution

### 1. `WorkOrderSummaryCard.tsx` -- Include linked PO materials in totals

After fetching work orders, also fetch the linked PO subtotals for any work orders that have a `linked_po_id`. Compute the true material total per work order (PO subtotal + markup) and add it to `tcToGcTotal`.

Steps:
- Select `linked_po_id`, `material_markup_type`, `material_markup_percent`, `material_markup_amount` in the work orders query (already fetches `material_total`)
- For work orders with `linked_po_id`, batch-fetch PO line item totals from `po_line_items` grouped by `po_id`
- For each work order, compute: `computedMaterialTotal = poSubtotal + markup` (or fall back to `material_total`)
- Use `labor_total + computedMaterialTotal + equipment_total` instead of `final_price` for the revenue total

### 2. `WorkOrdersTab.tsx` -- Show correct contract price on cards

The card at line 175 shows `changeOrder.final_price` for contracted orders. This also needs the linked PO material total included.

Steps:
- In `useChangeOrderProject` hook or in the tab itself, compute the true total per work order
- The `useChangeOrderProject` hook already fetches linked PO data for the detail page; check if it also provides it in the list
- If not available in the list view, compute it in the tab by fetching PO subtotals for all work orders with `linked_po_id`
- Display `labor_total + computedMaterialTotal + equipment_total` instead of `final_price`

### Technical Detail

The material total formula (matching the detail page):
```
baseMatTotal = SUM(po_line_items.line_total) WHERE po_id = linked_po_id
markupAmt = if percent: baseMatTotal * (markup_percent / 100)
            if lump_sum: markup_amount
computedMaterialTotal = baseMatTotal > 0 ? baseMatTotal + markupAmt : material_total
trueTotal = labor_total + computedMaterialTotal + equipment_total
```

### Files Modified
1. **`src/components/project/WorkOrderSummaryCard.tsx`** -- fetch PO line item subtotals, compute true revenue totals including materials
2. **`src/components/project/WorkOrdersTab.tsx`** -- compute and display correct contract price per work order card
