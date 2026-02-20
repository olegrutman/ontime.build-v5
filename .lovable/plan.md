
# Fix: Purchase Order Creation Blocked by RLS Policy

## Root Cause

The RLS INSERT policy on `purchase_orders` requires `is_pm_role(auth.uid())`, which only passes for users with roles `GC_PM`, `TC_PM`, or `FC_PM` in the `user_org_roles` table.

However, the UI shows the "Create PO" button based on `permissions?.canCreatePOs`, which can be `true` for admins or users with custom permission overrides -- even if their actual role string is not one of the three PM roles. This mismatch means the UI lets the user attempt the insert, but the database rejects it.

Additionally, the error message shown is "Unknown error" because the code catches the RLS violation but doesn't surface the specific database message to the user.

## Fix (2 parts)

### Part 1: Update the RLS INSERT policy to also allow admin users

Modify the `is_pm_role` function (or create an alternative check) so that org admins (`is_admin = true` in `user_org_roles`) can also create POs. This aligns the database-level authorization with the UI-level permission logic.

**Migration SQL:**
```sql
CREATE OR REPLACE FUNCTION public.is_pm_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_org_roles
    WHERE user_id = _user_id
      AND (role IN ('GC_PM', 'TC_PM', 'FC_PM') OR is_admin = true)
  )
$$;
```

This is safe because `is_pm_role` is already used by several PO policies, and admins should logically have PM-level access.

### Part 2: Improve the error message in PurchaseOrdersTab

In `src/components/project/PurchaseOrdersTab.tsx`, update the catch block around PO creation (around line 172) to surface the actual database error message instead of showing "Unknown error":

```typescript
} catch (err: any) {
  console.error('Error creating PO:', err);
  toast.error(`Failed to create PO: ${err?.message || 'Unknown error'}`);
}
```

This way, if there's ever another issue, the user sees the real reason.

## Files Changed

| File | Change |
|------|--------|
| Migration (SQL) | Update `is_pm_role` function to include `is_admin = true` |
| `src/components/project/PurchaseOrdersTab.tsx` | Improve error message in catch block |

## Risk Assessment
- **Low risk**: The `is_pm_role` function change only broadens access for org admins who already have full UI permissions. No existing behavior is removed.
