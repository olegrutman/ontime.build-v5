

# Fix: Apply Tax to PO Card Estimate Comparison

## Problem

On the PO card, the estimate-vs-PO comparison line shows **pre-tax** values:
- "Est $3,693 → $4,137 (+$444)"

But the card's **Total** is tax-inclusive ($4,332.46). This is inconsistent — per the rule to apply tax on everything, both sides of the comparison should also be tax-inclusive.

## What the numbers should be

- Estimate Walkout pack pre-tax: $3,693.29 × 1.0473 = **$3,867.98**
- PO subtotal pre-tax: $4,136.79 × 1.0473 = **$4,332.46**
- Delta: +$464.48

Card should show: **Est $3,868 → $4,332 (+$465)**

## Changes

### 1. `src/components/project/PurchaseOrdersTab.tsx` (line 119-126)

Apply the PO's `sales_tax_percent` to the estimate pack total when building `estimatePackTotals`. For each PO that has a source estimate, look up the tax rate and multiply the pack sum by `(1 + taxRate)`.

Currently the pack total is `unit_price × quantity` summed. We need to multiply by the estimate's tax rate. Since all POs from the same estimate share the same tax rate, we can grab it from the PO's `sales_tax_percent` field.

Update the loop to:
- Build the map with pre-tax totals as before
- After building, iterate over POs and apply each PO's tax rate to its corresponding pack entry

### 2. `src/components/purchase-orders/POCard.tsx` (lines 95-98)

The `poSubtotal` used in the comparison line sums raw `line_total` (pre-tax). Apply the PO's tax rate so it matches the tax-inclusive estimate total and the tax-inclusive Total shown below.

Change:
```
const poSubtotal = po.line_items
  ? po.line_items.reduce(...) : 0;
```
to multiply by `(1 + taxRate)` (where `taxRate` is already computed on line 89).

This makes both Est and PO sides tax-inclusive, and the delta reflects the true cost difference.

