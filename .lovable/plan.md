
Fix the submit failure by aligning backend permissions with the CO workflow and by making the frontend show a real permission error instead of the generic PostgREST message.

What I found
- The FC user is on a shared CO where:
  - `org_id` = TC org
  - `assigned_to_org_id` = FC org
- The submit click sends:
  ```text
  PATCH change_orders ... { status: "submitted", submitted_at: ... }
  ```
- That request returns 0 rows, and the code calls `.single()`, which turns the real problem into:
  ```text
  Cannot coerce the result to a single JSON object
  ```
- Root cause: current RLS only allows updating `change_orders` when the user belongs to `org_id` (the owner org). FC belongs to `assigned_to_org_id`, so FC can read the CO but cannot update it.

Implementation plan
1. Update backend access rules for CO status transitions
- Add a migration that replaces the overly narrow `change_orders` update policy with workflow-aware policies:
  - owner org can update its own COs
  - assigned org can update shared/rejected COs so FC/TC can submit upstream
  - upstream org can approve/reject submitted COs
- Keep this scoped to legitimate participants only, not public access.

2. Make submit/approve/reject mutations resilient
- In `src/hooks/useChangeOrderDetail.ts`, stop using `.single()` on status-change updates where 0 rows is possible under RLS.
- Use a safer fetch pattern (`select().maybeSingle()` or check array length) and throw a clear app-level error like:
  - “You don’t have permission to submit this change order”
  - or “Change order was not found or is no longer editable”

3. Keep the existing FC submit UI
- `COStatusActions.tsx` already allows FC submission from `shared`.
- No UX redesign needed; just wire it to the corrected backend permissions and clearer error handling.

4. Verify adjacent workflow actions
- Re-test these transitions because they rely on the same table/policy:
  - FC submit from `shared`
  - FC/TC resubmit from `rejected`
  - TC recall if allowed
  - GC or upstream approval/rejection from `submitted`
- This avoids fixing submit while leaving approve/reject broken for the next role.

Files likely involved
- `supabase/migrations/...sql`
- `src/hooks/useChangeOrderDetail.ts`
- possibly `src/components/change-orders/COStatusActions.tsx` for friendlier toast text only

Expected outcome
- FC can submit shared COs for approval successfully.
- The error toast no longer shows the confusing “Cannot coerce...” message.
- CO workflow permissions match the intended GC / TC / FC lifecycle instead of only the owner-org rule.
