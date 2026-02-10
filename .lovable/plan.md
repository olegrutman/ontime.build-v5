

# Fix: Signup "Database error finding user" (500)

## Root Cause

The `handle_new_user` trigger fires when a new user signs up and tries to INSERT into `public.profiles`. However, the `supabase_auth_admin` database role (which runs GoTrue/Auth operations) has **no INSERT permission** on the `profiles` table.

This causes the trigger to fail silently inside the auth transaction, rolling it back. GoTrue then can't find the partially-created user, producing the cryptic error: "unable to find user from email identity for duplicates: User not found" (HTTP 500).

## The Fix

Grant the `supabase_auth_admin` role INSERT permission on the `profiles` table, so the `handle_new_user` trigger can successfully create the profile row during signup.

## Database Migration

A single `GRANT` statement:

```text
GRANT INSERT ON public.profiles TO supabase_auth_admin;
```

## File Changes

| File | Change |
|---|---|
| New migration | `GRANT INSERT ON public.profiles TO supabase_auth_admin` |

No frontend code changes required -- the signup flow code is correct; it was the database permission blocking the trigger.

