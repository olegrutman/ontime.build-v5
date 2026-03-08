

# Fix: Platform Owner Can't See Contract Values

## Root Cause
The `project_contracts` table RLS SELECT policy only allows access to users who belong to `from_org_id` or `to_org_id`, or who created the project. The platform owner user has no org membership and didn't create the project, so the query returns empty `[]` despite 4 contracts existing in the database.

The `projects` table already has a policy using `is_platform_user(auth.uid())` but `project_contracts` is missing this.

## Fix

### 1. Add RLS policy for platform users on `project_contracts`
Add a new SELECT policy:
```sql
CREATE POLICY "Platform users can view all contracts"
ON public.project_contracts FOR SELECT
USING (is_platform_user(auth.uid()));
```

### 2. Verify other tables used on this page
Check and add the same policy to any other tables that platform detail page queries and might also be blocked:
- `supplier_estimates` (currently returns `[]` -- may also be RLS blocked)
- `invoices`, `purchase_orders`, `work_items` -- these already return data so they're fine

Single DB migration + verify `supplier_estimates` RLS. No code changes needed -- the UI already renders contracts when data is present.

