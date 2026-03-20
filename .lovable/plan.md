
Goal: Diagnose why CO creation still fails with “new row violates row-level security policy” and define the fix.

What I tested and found:
1) I reproduced the issue end-to-end in the UI:
- Opened Change Orders → New CO
- Completed Reason, Configuration, Location, Scope
- Clicked “Create Change Order”
- Result: 403 on `POST /rest/v1/change_orders?select=*` with:
  - code: `42501`
  - message: `new row violates row-level security policy for table "change_orders"`

2) I inspected the actual request payload from the failed POST:
- `org_id = 96a802b8-72a4-42e5-aa00-b7c675a9bb62`
- `project_id = 86e68e92-e94c-48b4-bf2d-89417049b72e`
- `created_by_user_id = ef6822a5-c7c0-4a0d-8ac6-3e8647d0452a`
- `assigned_to_org_id = ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6`
So the client is sending valid org/user values.

3) I verified DB policies currently deployed:
- `change_orders` INSERT policy is already:
  `WITH CHECK (user_in_org(auth.uid(), org_id))`
- `co_line_items` INSERT policy is already:
  `WITH CHECK (user_in_org(auth.uid(), org_id))`
So the prior insert-policy migrations are present.

4) Why it still fails:
- The create mutation uses `.insert(...).select().single()` (POST with `?select=*`), so DB must allow both INSERT and RETURNING visibility.
- Current SELECT policy is function-based: `USING (can_access_change_order(id))`.
- That function re-queries `change_orders` by id, which is brittle during INSERT+RETURNING evaluation and is the likely reason the insert is still rejected as RLS violation.

Implementation plan (fix):
1) Add a direct row-based SELECT policy on `change_orders` for owner/assigned org access (no self-lookup function).
   - Keep existing collaborator function policy for collaborator access.
   - New policy should be:
   ```sql
   CREATE POLICY "Users can select owned or assigned change orders (direct)"
   ON public.change_orders
   FOR SELECT
   TO authenticated
   USING (
     user_in_org(auth.uid(), org_id)
     OR (assigned_to_org_id IS NOT NULL AND user_in_org(auth.uid(), assigned_to_org_id))
   );
   ```

2) Keep existing INSERT policy as-is (`user_in_org(auth.uid(), org_id)`), since request payload and membership are valid.

3) Optional hardening (recommended):
- Update `createCO` mutation to avoid requiring RETURNING for creation:
  - pre-generate UUID client-side
  - insert without `.select().single()`
  - use generated id for line items/activity insert
This reduces fragility if SELECT policies change again.

4) Retest sequence after migration:
- Create CO via wizard
- Confirm POST `/change_orders?select=*` no longer returns 403
- Confirm `co_line_items` insert succeeds
- Confirm `co_activity` insert succeeds
- Confirm new CO appears in list and detail page

Technical notes:
- This is not a bad input problem; request values are correct.
- This is not an unauthenticated problem; auth token and org membership are valid.
- The failure is in RLS evaluation path during INSERT + representation return.
