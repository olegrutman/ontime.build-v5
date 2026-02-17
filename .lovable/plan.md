

# Fix: Newly Approved Member Cannot See Team Page

## Problem
When a new user gets approved to join an organization, they cannot see the team members on the Team page. The members list appears empty.

## Root Cause
The issue is **not** about the admin's view (which was already fixed with the `refetch()` call). The issue is about the **newly approved user's** experience:

1. User signs up and submits a join request -- at this point, `userOrgRoles` in the auth context (`useAuth`) is empty
2. Admin approves the request (a `user_org_roles` row is created server-side)
3. The user navigates to `/org/team`, but their auth context still has `userOrgRoles = []` (loaded at login, never refreshed)
4. In `useOrgTeam.ts`, `orgId` is derived from `userOrgRoles[0]?.organization?.id` -- this is `undefined`
5. `fetchData()` returns early on line 41: `if (!orgId) return`
6. The members list stays empty

Additionally, `needsOrgSetup` in `useAuth` is `true` when `userOrgRoles.length === 0`, which may redirect the user away from the team page entirely.

## Fix

### 1. File: `src/pages/OrgTeam.tsx` -- Refresh auth context on mount

Call `refreshUserData()` from the `useAuth` hook when the Team page mounts, so that if the user was recently approved, their `userOrgRoles` gets updated:

```typescript
const { userOrgRoles, refreshUserData } = useAuth();

useEffect(() => {
  refreshUserData();
}, []);
```

### 2. File: `src/hooks/useOrgTeam.ts` -- Handle delayed orgId availability

The `fetchData` callback already depends on `[orgId]`, and the `useEffect` depends on `[fetchData]`. Once `refreshUserData()` updates `userOrgRoles` in the auth context, `orgId` will change from `undefined` to the real value, triggering `fetchData` automatically. No change needed here.

## Summary

| File | Change |
|------|--------|
| `src/pages/OrgTeam.tsx` | Add `refreshUserData()` call on mount to ensure auth context is current |

This is a small one-file change. No database modifications needed.
