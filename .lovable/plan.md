

# Fix: GC Cannot Approve Estimates (RLS Policy Missing)

## Root Cause

The estimate for this project exists and has status **SUBMITTED** -- it was never actually approved because the GC's approval attempt silently failed due to a missing RLS policy.

Here is what the current RLS policies on `supplier_estimates` look like:

| Policy | Command | Who It Covers |
|--------|---------|---------------|
| "Project team can view estimates" | SELECT only | Any org participating in the project |
| "Suppliers manage own estimates" | ALL (SELECT, INSERT, UPDATE, DELETE) | Only the supplier org that owns the estimate |

When the GC PM clicks "Approve", it runs an UPDATE to set `status = 'APPROVED'`. But the GC org is **not** the supplier org, so the ALL policy does not match. The SELECT-only policy allows viewing but not updating. The UPDATE silently returns 0 rows affected -- no error is thrown, but the status never changes.

## Fix

### 1. Database Migration: Add UPDATE policy for GC project participants

Add a new RLS policy that allows project team members (specifically GC PMs) to update the `status`, `approved_at`, `approved_by`, and `notes` fields on estimates for their projects:

```sql
CREATE POLICY "Project team can update estimates"
  ON supplier_estimates
  FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_participants
      WHERE organization_id IN (
        SELECT organization_id FROM user_org_roles
        WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_participants
      WHERE organization_id IN (
        SELECT organization_id FROM user_org_roles
        WHERE user_id = auth.uid()
      )
    )
  );
```

This allows any project participant (GC, TC, FC) to update estimates on projects they belong to. The application code already restricts the approval UI to `GC_PM` role only, so the policy is safe.

### 2. Fix the approval handler to detect silent failures

In `src/pages/EstimateApprovals.tsx`, the `handleApprove` function currently only checks for `error` from the Supabase response. But when RLS blocks an update, Supabase returns success with 0 rows affected (no error). We should add a check on the returned data count to surface this properly. This is a minor code improvement -- the main fix is the RLS policy.

### Files to Change

| File | Change |
|------|--------|
| New migration SQL | Add "Project team can update estimates" UPDATE policy on `supplier_estimates` |
| `src/pages/EstimateApprovals.tsx` | Add `.select()` to the update call and verify the returned row count to detect silent RLS failures |

### No Other Changes Needed

- The `PackSelector` query (`status = 'APPROVED'`) is correct -- the issue is that the estimate never reached APPROVED status
- Once the RLS policy is added, existing approve/reject code will work as designed
