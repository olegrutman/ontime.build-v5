

# Plan: Platform Owner — Delete Organizations & Users

## Changes

### 1. Add two new actions to the edge function
**File: `supabase/functions/platform-support-action/index.ts`**
- Add `DELETE_ORGANIZATION: "PLATFORM_OWNER"` and `DELETE_USER: "PLATFORM_OWNER"` to `ACTION_MIN_ROLE`
- `DELETE_ORGANIZATION` case: deletes all `user_org_roles` for the org, then deletes the org from `organizations`. Snapshots the org name/type before deletion.
- `DELETE_USER` case: deletes the user from `auth.users` via `adminClient.auth.admin.deleteUser(user_id)` (cascades to profiles and user_org_roles via FK). Snapshots email/name before deletion.

### 2. Add "Delete Organization" button to PlatformOrgDetail
**File: `src/pages/platform/PlatformOrgDetail.tsx`**
- Add a destructive "Delete Organization" button (visible only to `PLATFORM_OWNER`)
- On click, open `SupportActionDialog` requiring a reason
- On confirm, invoke `platform-support-action` with `DELETE_ORGANIZATION` and `organization_id`
- On success, navigate back to `/platform/orgs`

### 3. Add "Delete User" button to PlatformUserDetail
**File: `src/pages/platform/PlatformUserDetail.tsx`**
- Add a destructive "Delete User" button (visible only to `PLATFORM_OWNER`)
- On click, open `SupportActionDialog` requiring a reason
- On confirm, invoke `platform-support-action` with `DELETE_USER` and `user_id`
- On success, navigate back to `/platform/users`

