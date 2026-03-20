

## Fix: co_line_items INSERT RLS policy

**Root cause**: Same recursive RLS issue as `change_orders`. The `co_line_items` INSERT policy uses a raw subquery against `user_org_roles`, which has its own RLS — causing silent failure.

**Fix**: Replace the INSERT policy to use `user_in_org()` security definer function.

### Database migration

```sql
DROP POLICY "Line items insertable by co owner org" ON public.co_line_items;

CREATE POLICY "Line items insertable by co owner org"
ON public.co_line_items
FOR INSERT
TO authenticated
WITH CHECK (user_in_org(auth.uid(), org_id));
```

### No code changes needed

