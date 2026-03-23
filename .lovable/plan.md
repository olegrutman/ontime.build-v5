

# Fix: TC Cannot Mark Work as Completed on Approved CO

## Root Cause

The TC clicks "Mark Work Completed" which calls `updateCO` to set `completed_at` on the CO. This fails with a 406 error ("0 rows") because **RLS blocks the update**.

The current RLS UPDATE policies on `change_orders`:
1. **"Assigned org can decide submitted"** — USING requires `status = 'submitted'` — fails (CO is `approved`)
2. **"Assigned org can work active"** — USING requires status in `shared/rejected/work_in_progress/closed_for_pricing` — fails
3. **"Owner org can update"** — requires `user_in_org(auth.uid(), org_id)` — `org_id` is the GC's org, so fails for TC

**None of the policies allow the assigned org (TC) to update an `approved` CO.** The TC needs to set `completed_at` but RLS won't let them touch the row.

Secondary issue: `updateCO` uses `.select().single()` which throws a 406 when RLS returns 0 rows instead of a clear permission error.

## Fix

### 1. Database Migration — Allow assigned org to update approved COs

Add a new RLS policy that lets the assigned org update change orders in `approved` status (for setting `completed_at`):

```sql
CREATE POLICY "Assigned org can update approved change orders"
ON public.change_orders
FOR UPDATE
TO authenticated
USING (
  assigned_to_org_id IS NOT NULL
  AND user_in_org(auth.uid(), assigned_to_org_id)
  AND status = 'approved'
)
WITH CHECK (
  assigned_to_org_id IS NOT NULL
  AND user_in_org(auth.uid(), assigned_to_org_id)
  AND status = 'approved'
);
```

### 2. Code — Use `maybeSingle()` in updateCO for better error messages

**File: `src/hooks/useChangeOrders.ts`** — Line 126

Change `.single()` to `.maybeSingle()` and add a null check to throw a clear permission error instead of a cryptic 406.

| File | Change |
|------|--------|
| Migration | Add RLS policy for assigned org to update approved COs |
| `src/hooks/useChangeOrders.ts` | Change `.single()` to `.maybeSingle()` with permission error fallback |

