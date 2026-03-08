

# Bug: Organization Updates Silently Fail — Missing RLS UPDATE Policy

## The Problem

When a user tries to update their organization (e.g., adding or changing an address), the save button appears to work but **nothing actually changes in the database**. The update silently fails with no error shown to the user.

## Root Cause

The `organizations` table has Row Level Security (RLS) enabled but **has no UPDATE policy**. The existing policies only cover:
- **INSERT** — any authenticated user can create an org
- **SELECT** — members can view their org

Without an UPDATE policy, every `.update()` call on the organizations table is silently rejected by the database. The code in `useProfile.ts` (`updateOrganization`) does not check for a "zero rows affected" scenario — it only catches thrown errors, so the failure is invisible to the user.

## Why It Looks Like It Works

1. User fills in the address fields and clicks "Save Organization"
2. The code sends the update to the database — the DB rejects it silently (0 rows updated, no error)
3. The code then optimistically updates local React state: `setOrganization(prev => ({ ...prev, ...updates }))` — so the UI shows the new values
4. The toast says "Organization updated"
5. On page refresh, the old (empty) values come back because nothing was actually saved

## Fix Plan

### 1. Add an UPDATE RLS policy on `organizations`
Create a migration that allows org members with `can_manage_team` permission (or admins) to update their organization:

```sql
CREATE POLICY "Members with manage permission can update organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT uor.organization_id FROM user_org_roles uor
    JOIN member_permissions mp ON mp.user_org_role_id = uor.id
    WHERE uor.user_id = auth.uid()
    AND (uor.is_admin = true OR mp.can_manage_team = true)
  )
)
WITH CHECK (
  id IN (
    SELECT uor.organization_id FROM user_org_roles uor
    JOIN member_permissions mp ON mp.user_org_role_id = uor.id
    WHERE uor.user_id = auth.uid()
    AND (uor.is_admin = true OR mp.can_manage_team = true)
  )
);
```

### 2. Add error handling for silent failures in `updateOrganization`
In `useProfile.ts`, check if the update actually affected rows, and show an error toast if it didn't. Also stop the optimistic state update when the DB call fails.

### Files Changed
- **Database migration** — add UPDATE policy on `organizations`
- **`src/hooks/useProfile.ts`** — improve error handling in `updateOrganization` to detect silent failures

