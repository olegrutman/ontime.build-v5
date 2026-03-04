

# Apply Tax Consistently to Budget vs Orders Comparisons

## Problem

Estimate pack item `line_total` values are **pre-tax**, but PO line items are multiplied by the PO's tax rate. This creates a mismatch in pack-level comparisons — you're comparing taxed PO costs against untaxed estimate costs.

Similarly, in `SupplierEstimateVsOrdersCard`, estimates use `total_amount` (tax-inclusive) but PO line totals are summed **without** tax.

## Changes

### 1. `src/hooks/useSupplierMaterialsOverview.ts`

**Estimate pack totals need tax applied** (lines 86-89):

Currently each pack sums raw `line_total`. Multiply by `(1 + salesTaxPercent / 100)` so pack budgets are tax-inclusive, matching the tax-inclusive PO ordered amounts.

- After computing `salesTaxPercent` (line 76), create `estimateTaxMult = 1 + salesTaxPercent / 100`
- Line 88: change `(item.line_total || 0)` → `(item.line_total || 0) * estimateTaxMult`

This makes `estimateItemsByPack` tax-inclusive, so pack comparisons, forecast logic, and "Packs Over Budget" table are all apples-to-apples.

### 2. `src/components/project/SupplierEstimateVsOrdersCard.tsx`

**PO totals need tax applied** (lines 67-70):

Currently sums raw `line_total` without tax. Apply each PO's `sales_tax_percent`.

Change the reduce to:
```
const totalOrders = pos?.reduce((sum, po) => {
  const subtotal = po.po_line_items?.reduce((s, li) => s + (li.line_total || 0), 0) || 0;
  const taxMult = 1 + ((po.sales_tax_percent || 0) / 100);
  return sum + subtotal * taxMult;
}, 0) || 0;
```

Both sides are now tax-inclusive → accurate difference and progress bar.

