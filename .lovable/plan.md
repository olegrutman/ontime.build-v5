

# Delete and Recreate Platform Owner Account

## Current State
- **User**: `owner@ontime.build` (user_id: `bd196a35-e30f-4a42-8c5c-d310be318ec3`)
- **Organization**: "Ontime.build" (id: `4f47c536-01b4-4979-b968-c2ba627e302a`) — no other members, no projects
- **Platform role**: `PLATFORM_OWNER`

## Plan

### Step 1: Delete existing data via edge function
Create a one-time edge function `admin-reset-owner` that uses the service role key to:
1. Delete from `platform_users` where user_id matches
2. Delete from `user_org_roles` where user_id matches
3. Delete from `profiles` where user_id matches
4. Delete the organization `4f47c536-01b4-4979-b968-c2ba627e302a`
5. Delete the auth user via `adminClient.auth.admin.deleteUser()`
6. Create a new auth user with email `owner@ontime.build`, password `Password123`, email confirmed
7. Create a `profiles` row for the new user
8. Create a `platform_users` row with role `PLATFORM_OWNER`
9. **No organization or org role** — this is a platform-only admin account

### Step 2: Invoke the function and verify

### Step 3: Delete the edge function after use

### Technical Notes
- Uses `SUPABASE_SERVICE_ROLE_KEY` (already available in edge function env)
- One-time operation — function will be removed after execution

