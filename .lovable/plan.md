

# Add "Mark Ordered" for Suppliers on SUBMITTED + Auto-Apply Estimate Tax on PO Creation

## Overview

Two changes:
1. Suppliers can mark a PO as "Ordered" directly from SUBMITTED status (skipping pricing if no edits needed)
2. When creating a PO from an estimate, automatically pull the estimate's `sales_tax_percent` and apply it to the PO totals

---

## Change 1: "Mark Ordered" Button for Suppliers on SUBMITTED

**File:** `src/components/purchase-orders/PODetail.tsx`

Currently, the "Mark Ordered" button only appears when `status === 'PRICED'` (line 556). Add an additional condition so suppliers also see it when `status === 'SUBMITTED'`:

- Around line 535-566, add a new block for SUBMITTED status that shows "Mark Ordered" for suppliers (alongside the existing "Add / Edit Pricing" button)
- The supplier can choose: edit pricing OR skip straight to ordered
- The button calls the existing `handleMarkOrdered` function which sets status to ORDERED with `ordered_at` timestamp

**Logic:**
```
if status === 'SUBMITTED' && effectiveIsSupplier && !editingPrices:
  show "Mark Ordered" button
```

---

## Change 2: Auto-Apply Estimate Tax on PO Creation

**File:** `src/components/project/PurchaseOrdersTab.tsx`

In the `handleCreatePO` function (around line 150):

1. After computing `source_estimate_id` from `data`, if it exists, query `supplier_estimates` to get `sales_tax_percent`
2. Use that tax percent when computing PO totals:
   - `taxAmount = poSubtotalTotal * (salesTaxPercent / 100)`
   - `poTotal = poSubtotalTotal + taxAmount`
3. Save `sales_tax_percent`, `tax_percent_applied`, `po_tax_total`, and `po_total` on the PO record

Current code (line 242-248) sets `po_total = poSubtotalTotal` with no tax. Updated code will:
```
const taxPercent = estimateTaxPercent || 0;
const taxAmount = poSubtotalTotal * (taxPercent / 100);
const poTotal = poSubtotalTotal + taxAmount;

update PO with:
  sales_tax_percent: taxPercent,
  tax_percent_applied: taxPercent,
  po_tax_total: taxAmount,
  po_total: poTotal,
```

Also apply the same tax logic in `handleEditComplete` (around line 355) so edits preserve the tax calculation.

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/purchase-orders/PODetail.tsx` | Show "Mark Ordered" button for suppliers when PO status is SUBMITTED |
| `src/components/project/PurchaseOrdersTab.tsx` | Fetch estimate tax percent on PO creation and edit; compute and save tax totals |

