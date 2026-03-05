

# Analysis: Delete User Fails and User Remains in List

## What's Happening (Plain English)

When you delete a user from the Platform, two things go wrong:

1. **The delete itself fails with "User not found"** — The authentication record for this user was likely already removed (perhaps from a previous attempt), but their profile record still exists in the database. The code tries to delete the auth record first, and when that fails, it stops entirely — never cleaning up the leftover profile row.

2. **The user still appears in the Users list** — The Users search page queries the `profiles` table, not the auth system. Since the profile row was never deleted (because the function errored out), the user keeps showing up.

There's also a secondary issue visible in the data: there are **two duplicate profile rows** for `michaelp@haleycustomhomes.com` (from the earlier create-user bug), which compounds the problem.

## Root Cause

In the `DELETE_USER` case of the edge function, the code does:
1. Look up the profile (for audit snapshot) — succeeds
2. Call `adminClient.auth.admin.deleteUser(user_id)` — **fails** if auth record is missing
3. Code returns 500 immediately, **never cleans up** the profile or org roles

The fix needs to:
- Treat "User not found" from auth deletion as non-fatal (the auth record is already gone, which is the desired state)
- Explicitly delete the `profiles` row and `user_org_roles` rows as a fallback, since the FK cascade only fires when the auth record is actually deleted
- Clean up orphaned duplicate profiles

## Plan

**File: `supabase/functions/platform-support-action/index.ts`** — In the `DELETE_USER` case:

1. Wrap `adminClient.auth.admin.deleteUser()` in a try-catch that treats "User not found" as success (auth record already gone)
2. After the auth deletion attempt, explicitly delete from `user_org_roles` and `profiles` where `user_id` matches — this handles the case where cascade didn't fire because the auth record was already absent
3. Let the function continue to log the action and return success

