

# Fix: Returns RLS Policy Blocking Submission

## Root Cause

Two bugs are preventing return creation:

### Bug 1: Case mismatch in project_team status check
The `returns` INSERT policy checks `pt.status = 'accepted'` (lowercase), but the actual `project_team` data stores `status = 'Accepted'` (capital A). This causes the policy to never match, blocking all INSERT operations.

### Bug 2: Status conflict between return and return_items
The `CreateReturnWizard` inserts the return record with `status: 'SUBMITTED'`, but the `return_items` INSERT policy requires the parent return to be in `DRAFT` status. So even if Bug 1 were fixed, the return_items insert would fail immediately after the return is created.

## Fix

### Database Migration (single SQL file)

**Fix the returns INSERT policy** -- change `'accepted'` to `'Accepted'`:

```sql
DROP POLICY "GC/TC can create returns" ON public.returns;
CREATE POLICY "GC/TC can create returns" ON public.returns
  FOR INSERT WITH CHECK (
    created_by_user_id = auth.uid()
    AND user_in_org(auth.uid(), created_by_org_id)
    AND EXISTS (
      SELECT 1 FROM project_team pt
      WHERE pt.project_id = returns.project_id
        AND pt.org_id = returns.created_by_org_id
        AND pt.status = 'Accepted'
        AND pt.role IN ('General Contractor', 'Trade Contractor')
    )
  );
```

**Fix the return_items INSERT policy** -- allow inserts when the parent return is in `DRAFT` or `SUBMITTED` status:

```sql
DROP POLICY "Creator can add return items to draft returns" ON public.return_items;
CREATE POLICY "Creator can add return items" ON public.return_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM returns r
      WHERE r.id = return_items.return_id
        AND r.status IN ('DRAFT', 'SUBMITTED')
        AND user_in_org(auth.uid(), r.created_by_org_id)
    )
  );
```

### No code changes needed
The `CreateReturnWizard.tsx` logic is correct -- only the RLS policies need updating.

## Files

| Action | File |
|--------|------|
| Create | `supabase/migrations/XXXXXX_fix_returns_rls.sql` |

