

# Fix Tax Calculation and Backfill Existing POs

## Problem

All existing POs linked to estimates show `sales_tax_percent: 0` and `po_tax_total: 0` because they were created before the tax logic was deployed. The estimate they come from has `sales_tax_percent: 5.13%`.

The current code is structurally correct for new POs, but has a silent failure mode: if the `supplier_estimates` query fails (e.g., RLS issue), the error is discarded and tax defaults to 0 with no console warning.

## Changes

### 1. Add error logging to tax fetch in handleCreatePO and handleEditComplete

**File:** `src/components/project/PurchaseOrdersTab.tsx`

In `handleCreatePO` (around line 184-193), add error handling:
- Log a `console.warn` if the supplier_estimates query returns an error, so we can diagnose silent RLS failures
- Same change in `handleEditComplete` (around line 390)

### 2. Backfill existing POs with correct tax

**Tool:** Database insert/update tool

Run an UPDATE to fix existing POs that have `source_estimate_id` set but `sales_tax_percent = 0`:
- Join `purchase_orders` with `supplier_estimates` on `source_estimate_id`
- Set `sales_tax_percent` and `tax_percent_applied` from the estimate
- Recompute `po_tax_total = po_subtotal_total * (sales_tax_percent / 100)`
- Recompute `po_total = po_subtotal_total + po_tax_total`
- Only update POs where `sales_tax_percent = 0` and `source_estimate_id IS NOT NULL` and `po_subtotal_total IS NOT NULL`

SQL:
```sql
UPDATE purchase_orders po
SET
  sales_tax_percent = se.sales_tax_percent,
  tax_percent_applied = se.sales_tax_percent,
  po_tax_total = po.po_subtotal_total * (se.sales_tax_percent / 100),
  po_total = po.po_subtotal_total + (po.po_subtotal_total * (se.sales_tax_percent / 100))
FROM supplier_estimates se
WHERE po.source_estimate_id = se.id
  AND (po.sales_tax_percent = 0 OR po.sales_tax_percent IS NULL)
  AND po.source_estimate_id IS NOT NULL
  AND po.po_subtotal_total IS NOT NULL
  AND se.sales_tax_percent > 0;
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/project/PurchaseOrdersTab.tsx` | Add console.warn on failed estimate tax query in both create and edit flows |
| Database (backfill) | UPDATE existing POs to apply correct tax from their linked estimates |
