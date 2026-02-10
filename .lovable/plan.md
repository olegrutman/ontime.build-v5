

# Fix: Signup Fails with "permission denied for table users"

## Root Cause

The `create_organization_and_set_admin` function (and two other RPCs: `accept_org_invitation`, `decline_org_invitation`) query `auth.users` to fetch the user's email. These functions are `SECURITY DEFINER` owned by `postgres`, but in Lovable Cloud `postgres` is not a true superuser. Since `auth.users` has Row-Level Security enabled with no policies granting `postgres` access, every `SELECT FROM auth.users` inside those functions fails with "permission denied for table users."

The signup flow hits this at Step 2 when `create_organization_and_set_admin` runs:
```sql
INSERT INTO profiles (...)
SELECT _user_id, email, ...
FROM auth.users WHERE id = _user_id   -- THIS LINE FAILS
```

## The Fix

Rewrite the three functions to **stop reading from `auth.users`**. Instead, pass email as a parameter or read it from `public.profiles` (which the `handle_new_user` trigger already populates during signup).

Specifically for `create_organization_and_set_admin`: the email is already available in `public.profiles` because the trigger inserts it before this RPC runs. So the function should read from `profiles` instead of `auth.users`.

## Database Migration

One migration that replaces three functions:

| Function | Current Problem | Fix |
|---|---|---|
| `create_organization_and_set_admin` | `SELECT email FROM auth.users` in profile upsert | Read email from `public.profiles` instead |
| `accept_org_invitation` | `SELECT email FROM auth.users` to match invitation | Read email from `public.profiles` instead |
| `decline_org_invitation` | `SELECT email FROM auth.users` to match invitation | Read email from `public.profiles` instead |

## File Changes

| File | Change |
|---|---|
| New migration | `CREATE OR REPLACE FUNCTION` for all three functions, replacing `auth.users` references with `public.profiles` lookups |

No frontend code changes needed -- the signup flow is correct; only the database functions need updating.

## Risk Considerations

- The `handle_new_user` trigger must fire before `create_organization_and_set_admin` runs. This is guaranteed because the trigger fires on INSERT to `auth.users` (during `supabase.auth.signUp`), and the RPC is called in a separate request afterward.
- The `accept_org_invitation` and `decline_org_invitation` functions also rely on `profiles` already existing, which is true for any authenticated user since the trigger creates it at signup.

