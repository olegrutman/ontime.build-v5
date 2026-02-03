

# Fix: Supplier Cannot See Purchase Orders

## Problem

Suppliers cannot see any Purchase Orders on their project page because the RLS (Row-Level Security) SELECT policies only check if the user belongs to the organization that **created** the PO, not the supplier organization.

**Current Policy:**
```sql
-- purchase_orders SELECT
user_in_org(auth.uid(), organization_id)  -- Only checks PO creator org
```

**Result:** Supplier org (`12b5d7de-...`) ≠ PO creator org (`96a802b8-...`) → Access Denied

## Solution

Update the SELECT policies for `purchase_orders` and `po_line_items` to also grant access to suppliers.

---

## Database Migration

### 1. Update `purchase_orders` SELECT Policy

Drop the old policy and create a new one that allows:
- Organization members who created the PO
- Suppliers who are assigned to the PO

```sql
DROP POLICY IF EXISTS "Org members can view POs" ON purchase_orders;

CREATE POLICY "Project participants and suppliers can view POs" 
ON purchase_orders FOR SELECT
USING (
  -- Creator org can view
  user_in_org(auth.uid(), organization_id)
  OR
  -- Supplier assigned to PO can view
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
);
```

### 2. Update `po_line_items` SELECT Policy

Similarly update line items visibility:

```sql
DROP POLICY IF EXISTS "Users can view PO line items" ON po_line_items;

CREATE POLICY "PO participants can view line items"
ON po_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_line_items.po_id
    AND (
      -- Creator org can view
      user_in_org(auth.uid(), po.organization_id)
      OR
      -- Supplier can view
      EXISTS (
        SELECT 1 FROM suppliers s
        WHERE s.id = po.supplier_id
          AND user_in_org(auth.uid(), s.organization_id)
      )
    )
  )
);
```

---

## No Frontend Changes Required

The frontend code in `PurchaseOrdersTab.tsx` is already correctly set up:
- It filters by `supplier_id` for supplier users (lines 61-74)
- But the query returns empty because the database blocks access at RLS level

Once the RLS policies are fixed, the existing frontend logic will work.

---

## Expected Behavior After Fix

| User Type | Can See POs |
|-----------|-------------|
| GC/TC (creator org) | ✅ All POs they created |
| Supplier | ✅ POs where they are assigned as supplier |
| FC | Only if they created the PO |

---

## Technical Summary

| Table | Action | Fix |
|-------|--------|-----|
| `purchase_orders` | SELECT | Add `OR EXISTS (supplier.organization_id = user org)` |
| `po_line_items` | SELECT | Add same supplier check via join |

