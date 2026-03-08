

# Create Platform Owner Account

## Problem
The `platform-support-action` edge function requires an authenticated Platform Owner to call it, creating a chicken-and-egg problem. We need to create the first platform owner directly.

## Plan

### 1. Create a new edge function `seed-platform-owner/index.ts`
A one-time-use edge function (no JWT required) that:
1. Creates auth user `olegrutman+owner@gmail.com` with password `Password1` (email auto-confirmed)
2. Upserts a profile record with the user's info
3. Inserts a `platform_users` row with `platform_role = 'PLATFORM_OWNER'` and `two_factor_verified = true`

### 2. Register in `supabase/config.toml`
Add `[functions.seed-platform-owner]` with `verify_jwt = false`.

### 3. Invoke the function once, then optionally delete it
After deployment, call the function to create the account. The function can be removed afterward for security.

### Files
- `supabase/functions/seed-platform-owner/index.ts` (new)
- `supabase/config.toml` (add entry)

