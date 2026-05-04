
## Problem

When a TC tries to submit (or edit) a Change Order that has `status = 'draft'`, RLS blocks the update. The "Assigned org can work active change orders" policy's `USING` clause lists `shared, rejected, combined, work_in_progress, closed_for_pricing, submitted, approved` — but **not `draft`**.

Since the TC belongs to `assigned_to_org_id` (not `org_id`), the only policy that could grant them UPDATE access is this one, and it fails on draft COs.

## Fix

Add `'draft'` to the USING clause of the "Assigned org can work active change orders" policy so TCs can update COs assigned to them while still in draft status.

```sql
DROP POLICY "Assigned org can work active change orders" ON change_orders;

CREATE POLICY "Assigned org can work active change orders"
ON change_orders FOR UPDATE TO authenticated
USING (
  assigned_to_org_id IS NOT NULL
  AND user_in_org(auth.uid(), assigned_to_org_id)
  AND status = ANY (ARRAY[
    'draft', 'shared', 'rejected', 'combined',
    'work_in_progress', 'closed_for_pricing', 'submitted', 'approved'
  ])
)
WITH CHECK (
  assigned_to_org_id IS NOT NULL
  AND user_in_org(auth.uid(), assigned_to_org_id)
  AND status = ANY (ARRAY[
    'shared', 'submitted', 'rejected', 'combined',
    'work_in_progress', 'closed_for_pricing', 'approved', 'draft'
  ])
);
```

No frontend changes needed — the error message will disappear once RLS allows the update.
