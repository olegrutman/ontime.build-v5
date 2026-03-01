

# PO Wizard Pricing + Totals Fix

## Overview

Add line-item pricing visibility, live totals, source tags, and audit columns to the PO Wizard and PO Detail screens. No redesign -- same layout, same flow, just richer data on each item row and a totals summary.

## Phase 1: Database Migration

Add new columns to support pricing traceability and totals.

**`po_line_items` -- new columns:**
- `source_estimate_item_id` (uuid, nullable, FK to `supplier_estimate_items.id`)
- `source_pack_name` (text, nullable)
- `price_source` (text, nullable, values: `FROM_ESTIMATE`, `SUPPLIER_MANUAL`, `CATALOG_DEFAULT`)
- `original_unit_price` (numeric, nullable) -- price at time of creation
- `price_adjusted_by_supplier` (boolean, default false)
- `adjustment_reason` (text, nullable)

**`purchase_orders` -- new columns:**
- `po_subtotal_estimate_items` (numeric, nullable)
- `po_subtotal_non_estimate_items` (numeric, nullable)
- `po_subtotal_total` (numeric, nullable)
- `po_tax_total` (numeric, nullable)
- `po_total` (numeric, nullable)
- `tax_percent_applied` (numeric, nullable)

## Phase 2: Type Updates

**`POWizardV2LineItem`** -- add fields to carry pricing through the wizard:
- `unit_price?: number | null` -- from estimate or catalog
- `line_total?: number | null` -- computed (qty x unit_price)
- `source_estimate_item_id?: string | null`
- `source_pack_name?: string | null`
- `price_source?: 'FROM_ESTIMATE' | 'SUPPLIER_MANUAL' | 'CATALOG_DEFAULT'`

**`POLineItem`** (types/purchaseOrder.ts) -- add matching DB columns.

## Phase 3: Carry Estimate Pricing Into Items

When items are loaded from an estimate pack (PSMBrowser / PSMUnmatchedList / PackSelector), carry `unit_price` from `supplier_estimate_items` into the `POWizardV2LineItem`.

**Files changed:**
- `src/components/po-wizard-v2/PSMBrowser.tsx` -- fetch `unit_price` from estimate items, pass to QuantityPanel and unmatched handler
- `src/components/po-wizard-v2/PackSelector.tsx` -- include `unit_price` when loading pack items
- `src/components/po-wizard-v2/QuantityPanel.tsx` -- preserve `unit_price`/`source_estimate_item_id` when building the line item

Items added from the full catalog (no estimate) get `unit_price: null` and `price_source: null` (will become `SUPPLIER_MANUAL` when supplier prices them).

## Phase 4: Items Screen -- Show Pricing + Source Tags

**File:** `src/components/po-wizard-v2/ItemsScreen.tsx`

For each item row, add below the existing quantity badges:
- **Unit Price**: `$X.XX / {uom}` or `--` if null
- **Line Total**: `$X.XX` or `--` if null
- **Source Tag** (small Badge):
  - `source_estimate_item_id` present + `unit_price` set: "From Estimate" (green outline)
  - `source_estimate_item_id` null + `unit_price` null: "Needs Supplier Pricing" (amber outline)
  - `price_adjusted_by_supplier` true: "Supplier Adjusted" + delta line

Add a sticky totals summary above the footer:
- Subtotal (Estimate Items): sum of line_totals where source_estimate_item_id is set
- Subtotal (Additional): sum of line_totals where source_estimate_item_id is null and unit_price is set
- Unpriced count warning if any items have no unit_price
- Tax % (from estimate header if available)
- Grand Total

All calculations are live -- changing qty in QuantityPanel recalculates immediately.

## Phase 5: Review Screen -- Full Totals Panel

**File:** `src/components/po-wizard-v2/ReviewScreen.tsx`

Add a "Totals" card below the Items card showing:
- Subtotal (Estimate Items)
- Subtotal (Additional Items)
- Subtotal (All)
- Tax (X%) -- amount
- **Total** (bold)
- Warning banner if unpriced items exist: "X items need supplier pricing to finalize total"

The Submit PO button remains enabled even with unpriced items (PO submits as-is; supplier prices later). The total shows as "Pending Pricing" if any items lack unit_price.

## Phase 6: PO Creation -- Persist New Fields

**Files:** `src/components/project/PurchaseOrdersTab.tsx`, `src/pages/PurchaseOrders.tsx`, `src/components/change-order-detail/MaterialResourceToggle.tsx`

When inserting `po_line_items`, include:
- `source_estimate_item_id`
- `source_pack_name`
- `price_source`
- `original_unit_price` (= unit_price at creation time)
- `unit_price`
- `line_total` (qty x unit_price, or null)

When inserting `purchase_orders`, compute and store:
- `po_subtotal_estimate_items`
- `po_subtotal_non_estimate_items`
- `po_subtotal_total`
- `po_tax_total` (subtotal x sales_tax_percent from estimate header)
- `po_total`
- `tax_percent_applied`

## Phase 7: Supplier Pricing Screen (PODetail) -- Audit Fields

**File:** `src/components/purchase-orders/PODetail.tsx`

When supplier saves pricing (`handleSavePrices`):
- If item had an `original_unit_price` and supplier changed it, set `price_adjusted_by_supplier = true`
- Store the new `unit_price` and recompute `line_total`
- If `original_unit_price` was null, set it to the supplier's price and set `price_source = 'SUPPLIER_MANUAL'`
- Add optional `adjustment_reason` input field per line item
- On "Mark as Priced", compute and save all PO-level totals (`po_subtotal_estimate_items`, etc.) and `tax_percent_applied`

Show "Adjusted from $old -> $new" inline for items where supplier changed the price.

## Phase 8: Edit Mode Preservation

**File:** `src/components/project/PurchaseOrdersTab.tsx` (handleEditPO)

When loading existing PO line items for editing, map the new DB columns back to `POWizardV2LineItem` fields so pricing/source data round-trips correctly through the wizard.

## Summary of Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add 6 columns to `po_line_items`, 6 to `purchase_orders` |
| `src/types/poWizardV2.ts` | Add pricing fields to `POWizardV2LineItem` |
| `src/types/purchaseOrder.ts` | Add new DB columns to `POLineItem` and `PurchaseOrder` |
| `src/components/po-wizard-v2/PSMBrowser.tsx` | Fetch + carry `unit_price` from estimate items |
| `src/components/po-wizard-v2/PackSelector.tsx` | Include `unit_price` when loading pack |
| `src/components/po-wizard-v2/QuantityPanel.tsx` | Preserve pricing fields on item build |
| `src/components/po-wizard-v2/ItemsScreen.tsx` | Show unit price, line total, source tags, sticky totals |
| `src/components/po-wizard-v2/ReviewScreen.tsx` | Add totals card with tax + warnings |
| `src/components/project/PurchaseOrdersTab.tsx` | Persist new fields on create + edit |
| `src/pages/PurchaseOrders.tsx` | Persist new fields on create |
| `src/components/change-order-detail/MaterialResourceToggle.tsx` | Persist new fields on auto-PO |
| `src/components/purchase-orders/PODetail.tsx` | Supplier adjustment tracking + totals save |

## What Does NOT Change
- Wizard step flow (Header -> Items -> Review)
- Overall layout and styling
- ProductPicker, CategoryGrid, StepByStepFilter internals
- PO status flow (ACTIVE -> SUBMITTED -> PRICED -> etc.)
- Any existing features

