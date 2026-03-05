

# Fix: First/Last Name Not Saved When Creating Users from Platform

## Root Cause

There's a race condition between two operations:

1. The `handle_new_user()` trigger fires on `auth.users` INSERT and creates a profile row with NULL first/last name (because no `user_metadata` is passed to `createUser`)
2. The edge function then tries to `INSERT` into profiles with the first/last name, but silently fails because the row already exists from the trigger

## Fix

**File: `supabase/functions/platform-support-action/index.ts`**

In the `CREATE_USER_AND_ADD` case, change the `profiles.insert` to an `upsert` (or an `update`) so the first/last name values overwrite the trigger-created row:

- Replace `adminClient.from("profiles").insert({...})` with `adminClient.from("profiles").upsert({...}, { onConflict: 'user_id' })`

This ensures the first name, last name, and full name provided in the form are persisted even though the trigger already created the profile row.

