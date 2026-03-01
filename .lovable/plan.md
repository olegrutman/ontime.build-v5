
# Fix: PO Wizard Estimate Pricing Data Loss

## Problem Summary

There are 3 bugs preventing estimate line prices from flowing into PO line items:

1. **Pack loading drops all pricing**: When a user selects an estimate pack, `ProductPicker.handleSelectPack` converts pack items to `POWizardV2LineItem` but omits `unit_price`, `source_estimate_item_id`, `source_pack_name`, and `price_source`. The `EstimatePackItem` interface inside `ProductPicker.tsx` doesn't even include `unit_price`.

2. **PSM matched items have no pricing**: When browsing matched estimate items through PSMBrowser's category/filter flow, the QuantityPanel receives no estimate pricing props. The estimate data (including `unit_price`) is loaded at startup but never looked up when a specific catalog product is selected.

3. **Duplicate interfaces out of sync**: `PackSelector.tsx` defines `EstimatePackItem` WITH `unit_price`. `ProductPicker.tsx` defines its own `EstimatePackItem` WITHOUT `unit_price`. They should be unified.

## Fixes

### Fix 1: ProductPicker.tsx -- Add pricing to pack loading

**File**: `src/components/po-wizard-v2/ProductPicker.tsx`

- Add `unit_price: number | null` to the local `EstimatePackItem` interface (line 24-32)
- In `handleSelectPack` (line 359-375), include pricing fields when mapping items:
  - `unit_price: item.unit_price`
  - `line_total: item.unit_price != null ? item.quantity * item.unit_price : null`
  - `source_estimate_item_id: item.id`
  - `source_pack_name: item.pack_name`
  - `price_source: item.unit_price != null ? 'FROM_ESTIMATE' : null`
  - `original_unit_price: item.unit_price`

### Fix 2: PSMBrowser.tsx -- Pass estimate pricing to QuantityPanel for matched items

**File**: `src/components/po-wizard-v2/PSMBrowser.tsx`

- Build a lookup map from `catalog_item_id` to `EstimateItem` during `loadEstimateData` (from the already-fetched matched items array)
- Store this map in state (e.g., `catalogToEstimateMap: Map<string, EstimateItem>`)
- When rendering the QuantityPanel for a selected product (line 492-497), look up the estimate item by `selectedProduct.id` and pass:
  - `estimateUnitPrice={matchedEstItem?.unit_price}`
  - `estimateItemId={matchedEstItem?.id}`
  - `estimatePackName={matchedEstItem?.pack_name}`

### Fix 3: PackSelector.tsx -- Include unit_price in onSelectPack callback data

**File**: `src/components/po-wizard-v2/PackSelector.tsx`

The `PackSelector` already fetches `unit_price` and includes it in its `EstimatePackItem` interface. However, verify the `onSelectPack` prop type accepts items with `unit_price`. The `ProductPicker`'s `EstimatePack` type must also include `unit_price` in its items -- this is handled by Fix 1 above.

### No database changes needed

All the columns (`source_estimate_item_id`, `price_source`, `original_unit_price`, `unit_price`, `line_total`) already exist in `po_line_items`. The persistence code in `PurchaseOrdersTab.handleCreatePO` already saves these fields correctly. The only problem is that the data never reaches the line items during wizard item creation.

## Files Changed

| File | Change |
|------|--------|
| `src/components/po-wizard-v2/ProductPicker.tsx` | Add `unit_price` to `EstimatePackItem`, include pricing fields in `handleSelectPack` |
| `src/components/po-wizard-v2/PSMBrowser.tsx` | Build catalog-to-estimate lookup, pass pricing props to QuantityPanel |

## What Does NOT Change
- QuantityPanel (already handles these props correctly)
- PurchaseOrdersTab persistence code (already saves these fields)
- Database schema (columns already exist)
- Wizard flow, layout, or styling
