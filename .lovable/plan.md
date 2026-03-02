

# Highlight Edited, Deleted, and Added Items on PO Detail

## What This Does

When a PO was built from an estimate pack, the line items table in the PO detail view will visually indicate what changed compared to the original pack:

- **Yellow background** -- items from the estimate that were edited (quantity or price changed)
- **Red background** -- items that were in the original estimate pack but removed from the PO; these are shown as extra rows with $0 cost and strikethrough text
- **Green background** -- items that were added to the PO but were not in the original estimate pack

## Changes

### 1. Fetch original estimate pack items in PODetail

**File:** `src/components/purchase-orders/PODetail.tsx`

- After fetching the PO and line items, check if the PO has `source_estimate_id` and `source_pack_name`
- If so, query `supplier_estimate_items` where `estimate_id = source_estimate_id` and `pack_name = source_pack_name`
- Store these original estimate items in state
- Build a lookup Map keyed by estimate item ID for fast comparison

### 2. Determine item status for each row

For each PO line item:
- If it has `source_estimate_item_id` and that ID exists in the estimate items map:
  - Compare quantity and unit_price to the original
  - If either differs -> **yellow** (edited)
  - If same -> no highlight (unchanged)
- If it has NO `source_estimate_item_id` -> **green** (added)

For estimate items NOT found in any PO line item's `source_estimate_item_id`:
- These are **deleted** items -> show as extra rows with **red** background, quantity from estimate, $0.00 cost, and strikethrough styling

### 3. Render highlights in the table

**File:** `src/components/purchase-orders/PODetail.tsx`

- Add conditional `className` on each `TableRow`:
  - Yellow: `bg-yellow-50 dark:bg-yellow-900/20`
  - Green: `bg-green-50 dark:bg-green-900/20`
  - Red: `bg-red-50 dark:bg-red-900/20` with `line-through` on description text
- For deleted items, append extra rows after the regular line items showing the removed items with 0 cost
- Add a small legend above the table when the PO is from an estimate, explaining the color coding

### 4. Visual layout

```text
+---+--------+------------------+-----+-----+---------+--------+
| # | SKU    | Description      | Qty | UOM | Unit $  | Total  |
+---+--------+------------------+-----+-----+---------+--------+
|   (normal row - unchanged from estimate)                      |
+---+--------+------------------+-----+-----+---------+--------+
| * | 2x4-10 | 2x4 Stud 10ft   |  50 | EA  |  $8.50  |$425.00 |  <- YELLOW (qty was 40)
+---+--------+------------------+-----+-----+---------+--------+
| * | —      | New bolts        |  20 | EA  |  $2.00  | $40.00 |  <- GREEN (added)
+---+--------+------------------+-----+-----+---------+--------+
| X | 4x4-8  | 4x4 Post 8ft    |  — | EA  |  $0.00  |  $0.00 |  <- RED (deleted)
+---+--------+------------------+-----+-----+---------+--------+
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/purchase-orders/PODetail.tsx` | Fetch estimate pack items; compare against PO line items; highlight rows yellow/green/red; show deleted items as $0 rows |

