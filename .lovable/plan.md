

# Fix: TC Can't See GC-Created POs

## Root Cause

Two issues in the last RLS migration:

### 1. Case Mismatch in Status Check (the main bug)
The new RLS policy checks for `pt.status = 'ACCEPTED'` (all uppercase), but the actual data in the `project_team` table stores the value as `'Accepted'` (title case). Since PostgreSQL text comparison is case-sensitive, this condition **never evaluates to true** -- the project-team path in the policy is dead code.

### 2. Old Policy Never Dropped
The migration was meant to replace the old policy `"Project participants and suppliers can view POs"` with `"Project team and suppliers can view POs"`, but the DROP statement was removed (from a prior failed migration attempt). Both policies now coexist. While PostgreSQL evaluates permissive policies with OR logic (so having both isn't harmful), the duplicate should be cleaned up.

## Fix (Single Database Migration)

Drop the old duplicate policy, then drop and recreate the new policy with the correct case (`'Accepted'` instead of `'ACCEPTED'`). Same fix for `po_line_items`.

```text
-- 1. Drop old duplicate purchase_orders SELECT policy
DROP POLICY IF EXISTS "Project participants and suppliers can view POs" ON purchase_orders;

-- 2. Drop current (broken) purchase_orders SELECT policy
DROP POLICY IF EXISTS "Project team and suppliers can view POs" ON purchase_orders;

-- 3. Recreate with correct case: 'Accepted' instead of 'ACCEPTED'
CREATE POLICY "Project team and suppliers can view POs"
ON purchase_orders FOR SELECT
USING (
  user_in_org(auth.uid(), organization_id)
  OR
  EXISTS (
    SELECT 1 FROM suppliers s
    WHERE s.id = purchase_orders.supplier_id
      AND user_in_org(auth.uid(), s.organization_id)
  )
  OR
  (
    purchase_orders.project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = purchase_orders.project_id
        AND pt.org_id = get_user_org_id(auth.uid())
        AND pt.status = 'Accepted'   -- Fixed: was 'ACCEPTED'
    )
  )
);

-- 4. Drop current (broken) po_line_items SELECT policy
DROP POLICY IF EXISTS "PO participants can view line items" ON po_line_items;
DROP POLICY IF EXISTS "PO team and suppliers can view line items" ON po_line_items;

-- 5. Recreate with correct case
CREATE POLICY "PO team and suppliers can view line items"
ON po_line_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    WHERE po.id = po_line_items.po_id
    AND (
      user_in_org(auth.uid(), po.organization_id)
      OR
      EXISTS (
        SELECT 1 FROM suppliers s
        WHERE s.id = po.supplier_id
          AND user_in_org(auth.uid(), s.organization_id)
      )
      OR
      (
        po.project_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM project_team pt
          WHERE pt.project_id = po.project_id
            AND pt.org_id = get_user_org_id(auth.uid())
            AND pt.status = 'Accepted'   -- Fixed: was 'ACCEPTED'
        )
      )
    )
  )
);
```

## No Frontend Changes Needed

The frontend code in `PurchaseOrdersTab.tsx` is already correct -- it queries all POs for the project and computes `canViewPricing` per PO. The only blocker was the RLS policy silently returning no rows for the project-team check path.

## Summary

| Item | Detail |
|------|--------|
| Root cause | `'ACCEPTED'` vs `'Accepted'` case mismatch in RLS policy |
| Secondary issue | Old duplicate SELECT policy not cleaned up |
| Fix | Single database migration: drop old policies, recreate with correct case |
| Files changed | 1 new migration file only |
| Risk | Low -- only changes SELECT policies, no schema changes |

