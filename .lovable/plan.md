
# Fix: TC Can't Submit CO in `closed_for_pricing` Status

## Root Cause

The RLS UPDATE policy **"Assigned org can work active change orders"** on `change_orders` only allows the assigned org (TC) to update when status is `shared`, `rejected`, or `combined`. The new statuses `work_in_progress` and `closed_for_pricing` were never added.

When TC clicks "Submit for approval", the `submitCO` mutation tries to UPDATE the CO from `closed_for_pricing` → `submitted`, but the RLS USING clause rejects it silently (returns 0 rows), triggering the "You don't have permission" error.

## Fix — Database Migration

Update two RLS policies on `change_orders`:

1. **"Assigned org can work active change orders"**
   - USING: add `work_in_progress`, `closed_for_pricing`
   - WITH CHECK: add `work_in_progress`, `closed_for_pricing`

```sql
DROP POLICY "Assigned org can work active change orders" ON public.change_orders;
CREATE POLICY "Assigned org can work active change orders" ON public.change_orders
  FOR UPDATE TO authenticated
  USING (
    assigned_to_org_id IS NOT NULL
    AND user_in_org(auth.uid(), assigned_to_org_id)
    AND status IN ('shared','rejected','combined','work_in_progress','closed_for_pricing')
  )
  WITH CHECK (
    assigned_to_org_id IS NOT NULL
    AND user_in_org(auth.uid(), assigned_to_org_id)
    AND status IN ('shared','submitted','rejected','combined','work_in_progress','closed_for_pricing')
  );
```

This single migration fixes both issues (TC submit blocked + TC can't edit during WIP).

No frontend changes needed — the UI logic is already correct.
