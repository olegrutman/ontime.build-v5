
# Fix: RLS Policies Blocking PO Line Items Creation

## Problem Identified

When creating a Purchase Order with engineered products, the system fails with:
> "new row violates row-level security policy for table 'po_line_items'"

**Root Cause:** The RLS (Row Level Security) policies for `po_line_items` are checking for status `'DRAFT'`, but the PO creation code now sets status to `'ACTIVE'`.

## Current Broken Policies

| Table | Policy | Current Check | Problem |
|-------|--------|---------------|---------|
| `po_line_items` | INSERT | `po.status = 'DRAFT'` | PO is created with `ACTIVE` - INSERT blocked |
| `po_line_items` | UPDATE | `po.status = 'DRAFT'` | Can't update items on ACTIVE POs |
| `po_line_items` | DELETE | `po.status = 'DRAFT'` | Can't delete items on ACTIVE POs |
| `purchase_orders` | DELETE | `status = 'DRAFT'` | Can't delete ACTIVE POs |
| `purchase_orders` | UPDATE (PM) | `status = 'DRAFT'` | Can't update ACTIVE POs |

## Solution

Update the RLS policies to check for `'ACTIVE'` instead of (or in addition to) `'DRAFT'`. Since we migrated all DRAFT POs to ACTIVE, we should:
1. Replace `'DRAFT'` with `'ACTIVE'` in all affected policies
2. Keep the logic otherwise unchanged (PM roles, org membership checks)

## Database Migration

The migration will:
1. Drop the existing outdated policies
2. Recreate them with `'ACTIVE'` status check

```sql
-- Fix po_line_items INSERT policy
DROP POLICY IF EXISTS "PM roles can insert line items for draft POs" ON po_line_items;
CREATE POLICY "PM roles can insert line items for active POs" ON po_line_items
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = po_line_items.po_id 
        AND po.status = 'ACTIVE'
        AND is_pm_role(auth.uid()) 
        AND user_in_org(auth.uid(), po.organization_id)
    )
  );

-- Fix po_line_items UPDATE policy  
DROP POLICY IF EXISTS "PM roles can update line items for draft POs" ON po_line_items;
CREATE POLICY "PM roles can update line items for active POs" ON po_line_items
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = po_line_items.po_id 
        AND po.status = 'ACTIVE'
        AND is_pm_role(auth.uid()) 
        AND user_in_org(auth.uid(), po.organization_id)
    )
  );

-- Fix po_line_items DELETE policy
DROP POLICY IF EXISTS "PM roles can delete line items from draft POs" ON po_line_items;
CREATE POLICY "PM roles can delete line items from active POs" ON po_line_items
  FOR DELETE TO public
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders po
      WHERE po.id = po_line_items.po_id 
        AND po.status = 'ACTIVE'
        AND is_pm_role(auth.uid()) 
        AND user_in_org(auth.uid(), po.organization_id)
    )
  );

-- Fix purchase_orders DELETE policy
DROP POLICY IF EXISTS "GC_PM can delete draft POs" ON purchase_orders;
CREATE POLICY "GC_PM can delete active POs" ON purchase_orders
  FOR DELETE TO public
  USING (
    is_gc_pm(auth.uid()) 
    AND organization_id = get_user_org_id(auth.uid()) 
    AND status = 'ACTIVE'
  );

-- Fix purchase_orders UPDATE policy for PM roles
DROP POLICY IF EXISTS "PM roles can update draft POs" ON purchase_orders;
CREATE POLICY "PM roles can update active POs" ON purchase_orders
  FOR UPDATE TO public
  USING (
    is_pm_role(auth.uid()) 
    AND organization_id = get_user_org_id(auth.uid()) 
    AND status = 'ACTIVE'
  );
```

## Implementation Steps

1. **Create database migration** - Update RLS policies from DRAFT to ACTIVE
2. **No code changes required** - The frontend code is already correct

## Expected Outcome

After this fix:
- Creating POs with any line items (including engineered products) will work
- Editing line items on ACTIVE POs will work
- Deleting line items on ACTIVE POs will work
- Deleting ACTIVE POs will work
- All edits locked once PO moves to SUBMITTED or beyond

---

## Technical Details

### Why This Happened

When we implemented the new 5-stage status flow (ACTIVE → SUBMITTED → PRICED → ORDERED → DELIVERED), we:
1. ✅ Added the new enum values
2. ✅ Updated the code to use `'ACTIVE'` for new POs
3. ✅ Migrated existing DRAFT POs to ACTIVE
4. ❌ Forgot to update the RLS policies that were checking for `'DRAFT'`

### Affected User Roles

| Role | Impact |
|------|--------|
| GC_PM | Can create/edit POs and line items |
| TC_PM | Can create/edit POs and line items |
| Suppliers | Unaffected (they only price SUBMITTED POs) |
