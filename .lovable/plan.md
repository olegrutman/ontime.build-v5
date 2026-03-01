

# Estimate Summary After Upload

## Overview

After an estimate is uploaded, show a rich summary card in the estimate detail sheet with financial totals, pack breakdown, and tax details. Also add a `sales_tax_percent` field to the estimate so tax can be stored and edited.

## Phase 1: Database Migration

Add a new column to `supplier_estimates`:
- `sales_tax_percent` (numeric, nullable, default 0) -- tax rate set by the supplier

## Phase 2: Type Update

Update `SupplierProjectEstimate` in `src/types/supplierEstimate.ts`:
- Add `sales_tax_percent?: number | null`

## Phase 3: Estimate Summary Component

Create a new component `src/components/estimate-summary/EstimateSummaryCard.tsx` that receives the estimate items array and `sales_tax_percent`, then computes and displays:

**Financial Totals:**
- Subtotal (before tax): sum of all `quantity * unit_price`
- Tax %: editable input (saves to `supplier_estimates.sales_tax_percent`)
- Tax Amount: subtotal x tax%
- Total (including tax): subtotal + tax amount

**Pack Breakdown (table or card list):**
- For each pack:
  - Pack name
  - Number of items in the pack
  - Pack subtotal (sum of qty x unit_price for items in that pack)
  - Percentage of total estimate: `(pack_subtotal / estimate_subtotal) * 100`

**Overall Stats:**
- Total number of packs
- Total number of items across all packs

The tax % input will be an inline editable field. When changed, it saves to the database and recalculates the displayed tax amount and grand total.

## Phase 4: Integrate Into Estimate Detail Sheet

In `src/pages/SupplierProjectEstimates.tsx`, inside the estimate detail Sheet (between the status/actions area and the line items table), render the `EstimateSummaryCard` when `estimateItems.length > 0`.

Pass:
- `items={estimateItems}`
- `salesTaxPercent={selectedEstimate.sales_tax_percent}`
- `estimateId={selectedEstimate.id}`
- `onTaxUpdate={(newPercent) => ...}` -- callback to save and refresh

Also update `total_amount` on the estimate record whenever items are loaded (recalculate from items to keep it in sync).

## Files Changed

| File | Change |
|------|--------|
| Migration SQL | Add `sales_tax_percent` to `supplier_estimates` |
| `src/types/supplierEstimate.ts` | Add `sales_tax_percent` field |
| `src/components/estimate-summary/EstimateSummaryCard.tsx` | New component with full summary |
| `src/pages/SupplierProjectEstimates.tsx` | Render summary card in detail sheet |

## What Does NOT Change
- Estimate upload wizard flow
- Item table display (stays below the summary)
- Estimate status flow
- Any PO wizard behavior

