

# Fix: Members Not Showing on Team Page

## Problem
The Members list on the Team page shows no members (or "Unknown" names) because the query to fetch members with their profiles is failing with a **400 error**: "Could not find a relationship between 'user_org_roles' and 'profiles'".

## Root Cause
The `useOrgTeam` hook (line 47) uses a PostgREST embedded join:
```
profile:profiles(full_name, email)
```

This requires a **foreign key relationship** between `user_org_roles` and `profiles`. Currently, `user_org_roles.user_id` has no FK to `profiles.user_id`, so PostgREST rejects the query entirely with a 400 status. This means **zero members** are returned -- not even without profile data.

The `org_invitations` query also fails (403 -- separate RLS issue), but the members query is the primary blocker.

## Fix

### 1. Database Migration: Add FK from `user_org_roles.user_id` to `profiles.user_id`

```sql
ALTER TABLE public.user_org_roles
  ADD CONSTRAINT user_org_roles_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
```

This enables PostgREST to resolve the `profile:profiles(...)` join.

### 2. Frontend: Add fallback query in `useOrgTeam.ts`

If the join still returns null profiles (e.g., due to RLS), add a fallback that fetches profiles separately (similar to what `OrgTeam.tsx` already does for join requests). This ensures member names always display.

Update `fetchData` in `useOrgTeam.ts` to:
- First try the joined query
- If any member has a null profile, fetch profiles separately using `.in('user_id', userIds)` and merge them

### 3. RLS on `org_invitations`: Fix the 403 error

The `org_invitations` SELECT query returns 403 ("permission denied for table users"). This suggests an RLS policy on `org_invitations` references `auth.users` in a way that causes a permission error. Need to check and fix the RLS policy so org admins can read their org's pending invitations.

## Summary

| Change | File/Location | Detail |
|--------|--------------|--------|
| Add FK constraint | Database migration | `user_org_roles.user_id` -> `profiles.user_id` |
| Fallback profile fetch | `src/hooks/useOrgTeam.ts` | Fetch profiles separately if join returns nulls |
| Fix invitations RLS | Database migration | Fix policy on `org_invitations` that references `auth.users` |

