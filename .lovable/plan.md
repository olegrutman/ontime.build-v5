

## Fix: CO creation fails with RLS violation

**Root cause**: The INSERT policy on `change_orders` uses a raw subquery:
```sql
org_id IN (SELECT organization_id FROM user_org_roles WHERE user_id = auth.uid())
```
The `user_org_roles` table has its own RLS with a SELECT policy using `user_in_org(auth.uid(), organization_id)`. When Postgres evaluates the INSERT policy's subquery, it applies `user_org_roles` RLS, which calls `user_in_org`, which itself queries `user_org_roles` — creating a recursive RLS evaluation that silently returns no rows.

**Fix**: Replace the INSERT policy to use the existing `user_in_org()` security-definer function (which bypasses RLS):

### Database migration

Drop and recreate the INSERT policy on `change_orders`:

```sql
DROP POLICY "Users can insert change orders for their org" ON public.change_orders;

CREATE POLICY "Users can insert change orders for their org"
ON public.change_orders
FOR INSERT
TO authenticated
WITH CHECK (user_in_org(auth.uid(), org_id));
```

This uses the `user_in_org` SECURITY DEFINER function which bypasses RLS on `user_org_roles`, avoiding the recursive check.

### No code changes needed
The wizard code is correct — only the RLS policy needs fixing.

### Files to change
- Database migration only (one SQL statement)

