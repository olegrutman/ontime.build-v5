

## Problem Summary

The PO update from `ACTIVE` to `SUBMITTED` fails with RLS error 42501 at the "submit" stage.

The root cause is in the database policy structure:

```sql
-- Current policy (from migration 20260202171941)
CREATE POLICY "PM roles can update active POs" ON purchase_orders
  FOR UPDATE TO public
  USING (
    is_pm_role(auth.uid()) 
    AND organization_id = get_user_org_id(auth.uid()) 
    AND status = 'ACTIVE'
  );
  -- NO WITH CHECK clause!
```

### Why this fails

In PostgreSQL RLS:
- `USING` clause controls which rows you can **select for update** (the "before" state)
- `WITH CHECK` clause controls what the **new row values** must satisfy (the "after" state)
- When `WITH CHECK` is omitted, PostgreSQL uses `USING` for both checks

So when updating status from `ACTIVE` → `SUBMITTED`:
1. Row is selected for update (passes USING: status = 'ACTIVE')
2. Row is updated (status = 'SUBMITTED')
3. New row checked against USING (fails: status is now 'SUBMITTED', not 'ACTIVE')

---

## Solution: Add WITH CHECK clause to allow status transitions

We need a database migration that modifies the UPDATE policy to:
- Keep the USING clause (only ACTIVE POs can be selected for update by PM)
- Add a WITH CHECK clause that allows the new status to be SUBMITTED (or other valid transitions)

---

## Implementation Steps

### Step 1: Database Migration

Add a new migration to fix the UPDATE policy:

```sql
-- Fix purchase_orders UPDATE policy to allow ACTIVE → SUBMITTED transition
DROP POLICY IF EXISTS "PM roles can update active POs" ON purchase_orders;

CREATE POLICY "PM roles can update active POs" ON purchase_orders
  FOR UPDATE TO public
  USING (
    is_pm_role(auth.uid()) 
    AND organization_id = get_user_org_id(auth.uid()) 
    AND status = 'ACTIVE'
  )
  WITH CHECK (
    is_pm_role(auth.uid()) 
    AND organization_id = get_user_org_id(auth.uid())
    AND status IN ('ACTIVE', 'SUBMITTED')
  );
```

This allows:
- PM roles to update ACTIVE POs in their org
- The status to change to either ACTIVE (edit without submit) or SUBMITTED (submit flow)

---

## Why This Fix is Correct

- Matches existing security model: only PM roles in the owning org can update
- Preserves the "editable only when ACTIVE" rule (USING clause)
- Explicitly allows the ACTIVE → SUBMITTED transition (WITH CHECK clause)
- No code changes needed - the existing 3-step flow in `MaterialResourceToggle.tsx` will work

---

## Verification

After migration:
1. Open a change order page
2. Toggle "Materials Needed"
3. Click "Add Materials via Product Picker"
4. Add items and complete
5. Confirm:
   - PO creates successfully (ACTIVE)
   - Line items are added
   - PO transitions to SUBMITTED (no RLS error)
   - Toast shows success message

---

## Files Involved

| Type | Location |
|------|----------|
| Database | New migration to fix `purchase_orders` UPDATE policy |

