
# Fix: PO Creation RLS Policy for Multi-Org Users

## Root Cause

The INSERT policy on `purchase_orders` uses:
```
is_pm_role(auth.uid()) AND (organization_id = get_user_org_id(auth.uid()))
```

The `get_user_org_id` function does `SELECT organization_id FROM user_org_roles WHERE user_id = _user_id LIMIT 1` -- it returns only ONE org without a deterministic order. For users like `gc@test.com` who belong to multiple organizations, this non-deterministically picks one org. If the frontend sets `organization_id` to the user's other org, the RLS check fails with "new row violates row-level security policy".

The same problem affects the `po_line_items` INSERT policy and several UPDATE policies.

## Fix

### Part 1: Update PO INSERT policy

Replace `organization_id = get_user_org_id(auth.uid())` with `user_in_org(auth.uid(), organization_id)`. This checks whether the user actually belongs to the org being inserted, regardless of how many orgs they have.

```sql
DROP POLICY IF EXISTS "PM roles can create POs" ON purchase_orders;
CREATE POLICY "PM roles can create POs" ON purchase_orders
  FOR INSERT WITH CHECK (
    is_pm_role(auth.uid()) AND user_in_org(auth.uid(), organization_id)
  );
```

### Part 2: Update PO UPDATE policies that use `get_user_org_id`

Same fix for:
- "PM roles can update active POs"
- "GC_PM can update any PO"
- "GC_PM can delete active POs"

Replace `organization_id = get_user_org_id(auth.uid())` with `user_in_org(auth.uid(), organization_id)`.

### Part 3: Update `po_line_items` policies

The INSERT/UPDATE/DELETE policies on `po_line_items` also call `user_in_org(auth.uid(), po.organization_id)` -- these are already correct and don't use `get_user_org_id`, so no changes needed there.

### Part 4: Fix `get_user_org_id` for determinism (defense in depth)

Add `ORDER BY created_at ASC` to `get_user_org_id` so it at least returns a consistent result if used elsewhere:

```sql
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_org_roles
  WHERE user_id = _user_id
  ORDER BY created_at ASC
  LIMIT 1
$$;
```

## Files Changed

| File | Change |
|------|--------|
| SQL Migration | Update 4 RLS policies on `purchase_orders` + fix `get_user_org_id` ordering |

## Risk Assessment
- **Low risk**: Using `user_in_org` is more correct than `get_user_org_id` -- it checks the actual org being written rather than guessing which org the user "belongs to." The `user_in_org` function is already used throughout other policies.
