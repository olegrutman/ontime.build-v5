

# Fix: "Unknown User" on Join Requests — RLS Policy Blocking Profile Access

## Root Cause

The `profiles` table has a SELECT policy called "Org members can view profiles" that only allows reading profiles of users who share the same organization (via `user_org_roles`). When a new user submits a join request, they are **not yet a member** of that organization, so the admin cannot read their profile row. The query returns `null`, and the UI falls back to "Unknown User".

The profile data IS being saved correctly (verified in the database). The admin simply cannot see it due to row-level security.

## Fix

Add a new RLS policy on `profiles` that allows organization admins to view profiles of users who have a **pending join request** to their organization.

```sql
CREATE POLICY "Org admins can view join request profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM org_join_requests ojr
      JOIN user_org_roles uor ON uor.organization_id = ojr.organization_id
      WHERE ojr.user_id = profiles.user_id
        AND ojr.status = 'pending'
        AND uor.user_id = auth.uid()
    )
  );
```

This is a single database migration. No frontend changes are needed — the existing query in `OrgTeam.tsx` will automatically return the correct profile data once the RLS policy permits it.

## Technical Details

| Change | Detail |
|--------|--------|
| New RLS policy on `profiles` | Allows authenticated users to SELECT profiles of users with a pending `org_join_requests` entry targeting the viewer's organization |
| Scope | Only exposes profiles to admins of the org being requested to join, and only while the request is pending |
| Frontend changes | None |

