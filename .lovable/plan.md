

# Show Estimate/Pack Origin Info on PO Cards

## What Changes

Each PO card on the Purchase Orders page will show whether it was built from an estimate, which pack it came from, and a pricing comparison section showing original vs final pricing and item count changes.

## Changes

### 1. Expand the line_items query in PurchaseOrdersTab

**File:** `src/components/project/PurchaseOrdersTab.tsx`

- Update the Supabase query (line 72) to fetch additional fields from `po_line_items`:
  - `source_estimate_item_id`, `source_pack_name`, `original_unit_price`, `price_adjusted_by_supplier`, `quantity`
- Also select `source_estimate_id`, `source_pack_name`, `pack_modified` from the PO itself (these are already returned by `*` but need to be typed)

### 2. Update PurchaseOrder type to include estimate fields

**File:** `src/types/purchaseOrder.ts`

- Add to the `PurchaseOrder` interface:
  - `source_estimate_id?: string | null`
  - `source_pack_name?: string | null`  
  - `pack_modified?: boolean | null`

### 3. Update POCard to display estimate/pack info

**File:** `src/components/purchase-orders/POCard.tsx`

Add a new section on each card (between the supplier/items grid and the pricing section) that shows:

- **"From Estimate" badge** -- a small colored badge (e.g., purple) that appears if `po.source_estimate_id` is set
- **Pack name** -- display the pack name if `po.source_pack_name` is set (e.g., "Pack: Framing Lumber")
- **Original vs Final pricing** -- compute from line items:
  - `originalTotal = sum of (original_unit_price * quantity)` for items that have `source_estimate_item_id`
  - `finalTotal = sum of line_total` for those same items
  - `adjustment = finalTotal - originalTotal`
  - Display: "Est: $X,XXX -> Final: $X,XXX" with adjustment amount in green/red
- **Item count comparison**:
  - `estimateItems = count of items with source_estimate_item_id`
  - `totalItems = total line item count`
  - Display: "Est items: X of Y" (or "X est + Y added" if there are non-estimate items)

All pricing info is only shown when `canViewPricing` is true.

### 4. Update line_items select in query

**File:** `src/components/project/PurchaseOrdersTab.tsx` (line 72)

Change from:
```
line_items:po_line_items(id, unit_price, line_total)
```
To:
```
line_items:po_line_items(id, unit_price, line_total, quantity, source_estimate_item_id, source_pack_name, original_unit_price, price_adjusted_by_supplier)
```

## Visual Layout on Card

```text
+------------------------------------------+
| [Package icon]  PO-001        [Status]   |
| Jan 15, 2026                             |
|                                          |
| Supplier: ABC Lumber  |  Items: 12       |
|                                          |
| [From Estimate]  Pack: Framing Lumber    |
| Est: $8,500 -> Final: $8,720 (+$220)    |
| 10 est items + 2 added                   |
|                                          |
| Total                        $9,417.60   |
+------------------------------------------+
```

## Files Changed

| File | Change |
|------|--------|
| `src/types/purchaseOrder.ts` | Add estimate source fields to PurchaseOrder interface |
| `src/components/project/PurchaseOrdersTab.tsx` | Expand line_items query to include estimate fields |
| `src/components/purchase-orders/POCard.tsx` | Display estimate/pack origin badge, pricing comparison, item counts |
