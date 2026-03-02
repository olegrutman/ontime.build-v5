

# Fix Supplier Invoice Creation and Visibility

## Two Problems

### Problem 1: `invoice_line_items` RLS blocks supplier inserts
The invoice itself is created successfully (201), but inserting line items fails (403). All 4 RLS policies on `invoice_line_items` require `JOIN project_contracts pc ON pc.id = i.contract_id`. Since supplier invoices have `contract_id = NULL`, the JOIN returns nothing and the policy blocks the insert.

### Problem 2: Supplier invoices don't appear on GC/TC invoice pages
The `InvoicesTab` separates invoices into "sent" and "received" buckets based on `contract_id` matching. PO-based invoices with `contract_id = NULL` fall into neither bucket and are invisible.

### Problem 3: Orphaned invoices in DB
Two invoices (INV-SU-0001, INV-SU-0002) were created without line items due to the RLS failure. These need cleanup.

---

## Fix 1: Update `invoice_line_items` RLS Policies (Database Migration)

Add the same PO-supplier alternative path to all 4 policies (SELECT, INSERT, UPDATE, DELETE):

```text
Current: JOIN project_contracts pc ON pc.id = i.contract_id (fails when contract_id is NULL)

New: Add alternative path:
  OR (i.contract_id IS NULL AND i.po_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM purchase_orders po
        JOIN suppliers s ON s.id = po.supplier_id
        WHERE po.id = i.po_id
        AND user_in_org(auth.uid(), s.organization_id)))
```

For SELECT, also add a path for the GC/buyer org to view supplier invoice line items:
```text
  OR (i.contract_id IS NULL AND i.po_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM purchase_orders po
        WHERE po.id = i.po_id
        AND user_in_org(auth.uid(), po.organization_id)))
```

## Fix 2: Update `InvoicesTab` to Show Supplier Invoices

**File:** `src/components/invoices/InvoicesTab.tsx`

- In the sent/received split logic (lines 91-101): classify invoices with `contract_id = NULL AND po_id != NULL` as "received" for GC/TC users (these are supplier invoices received from suppliers)
- For suppliers viewing the invoices tab: classify PO-based invoices as "sent"
- Update GC role context messaging to mention supplier invoices
- Update `getInvoicePermissions` to handle contract-less invoices (GC can approve PO-based invoices)

## Fix 3: Clean Up Orphaned Invoices

Delete the 2 orphaned invoice records (no line items) via data operation.

---

## Files Changed

| File | Action |
|------|--------|
| Database migration | Update 4 RLS policies on `invoice_line_items` |
| Database data cleanup | Delete 2 orphaned invoices |
| `src/components/invoices/InvoicesTab.tsx` | Add PO-based invoice handling to sent/received logic |

