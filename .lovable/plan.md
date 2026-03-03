

# Fix: Include Sales Tax in Materials Budget Status Numbers

## Problem
The Materials Budget Status card compares **tax-inclusive** estimate totals (`total_amount` includes tax — confirmed: items sum $262K + 4.73% tax ≈ $274.8K = `total_amount`) against **pre-tax** PO line item sums. This makes it look like materials are under budget when they may not be.

## Change: `src/hooks/useSupplierMaterialsOverview.ts`

**1. Expand PO query** (line 95): Add `sales_tax_percent` to the PO select so each PO's tax rate is available.

**2. Apply tax to PO totals** (lines 121-157): After summing each PO's line items into `poTotal`, multiply by `(1 + po.sales_tax_percent / 100)` to get the tax-inclusive total. This affects:
- `materialsOrdered`
- `deliveredTotal`
- `orderedByPack` (pack-level tracking)
- `unmatchedMap` item costs

**3. Apply tax to chart data**: The cumulative ordered/delivered chart values will automatically be correct since they derive from the now-tax-inclusive PO totals.

The forecast, variance, and pack comparison calculations all flow from these base numbers, so they'll be correct once the inputs include tax.

**1 file, ~10 lines changed. No database changes.**

