

# Compare PO Price Against Estimate Pack Price

## What This Does

Instead of comparing prices item-by-item within the PO itself, the PO cards will now pull the **original pack total from the estimate** (sum of all items in that pack from `supplier_estimate_items`) and compare it against the **total ordered on the PO**.

## Changes

### 1. Fetch estimate pack totals in PurchaseOrdersTab

**File:** `src/components/project/PurchaseOrdersTab.tsx`

After fetching POs (around line 100), add a second query:
- Collect all unique `(source_estimate_id, source_pack_name)` pairs from the fetched POs
- For each estimate ID, query `supplier_estimate_items` filtering by `estimate_id` and `pack_name`
- Compute: `packTotal = sum(unit_price * quantity)` and `packItemCount = count of items`
- Store results in a Map keyed by `"estimateId|packName"`
- Pass `estimatePackTotal` and `estimatePackItemCount` as new props to each `POCard`

### 2. Update POCard props and comparison logic

**File:** `src/components/purchase-orders/POCard.tsx`

- Add two new props: `estimatePackTotal?: number | null` and `estimatePackItemCount?: number | null`
- Replace the current `originalTotal` calculation (which uses `original_unit_price` from PO line items) with the `estimatePackTotal` prop
- Replace `estimateItemCount` display with `estimatePackItemCount` (original number of items in the pack)
- The "ordered" side uses the PO subtotal (sum of all `line_total` on the PO)
- Display becomes: `Pack: $8,500 (12 items) -> Ordered: $8,720 (14 items) (+$220)`
- `adjustment = poSubtotal - estimatePackTotal`

### 3. Pass props in the render

**File:** `src/components/project/PurchaseOrdersTab.tsx` (render section ~line 486)

- Look up the pack totals map using `po.source_estimate_id` and `po.source_pack_name`
- Pass `estimatePackTotal` and `estimatePackItemCount` to each `POCard`

## Files Changed

| File | Change |
|------|--------|
| `src/components/project/PurchaseOrdersTab.tsx` | Query `supplier_estimate_items` for pack totals; pass as props to POCard |
| `src/components/purchase-orders/POCard.tsx` | Accept new props; use estimate pack total for comparison instead of item-level original prices |

