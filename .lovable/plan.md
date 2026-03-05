

# Plan: Allow Platform Owner to Change User Role

## Changes

### 1. Add `CHANGE_USER_ROLE` action to edge function
**File: `supabase/functions/platform-support-action/index.ts`**
- Add `CHANGE_USER_ROLE: "PLATFORM_OWNER"` to `ACTION_MIN_ROLE`
- New case that takes `user_org_role_id`, `new_role`, and optional `new_is_admin` (boolean)
- Snapshots old role/is_admin, updates `user_org_roles` row, snapshots new values

### 2. Add role change UI to PlatformUserDetail memberships list
**File: `src/pages/platform/PlatformUserDetail.tsx`**
- Add an "Edit" button next to each membership row (visible to `PLATFORM_OWNER`)
- On click, open a dialog with:
  - A Select dropdown for the new role (populated from `ALLOWED_ROLES_BY_ORG_TYPE` based on the org's type)
  - A checkbox for Admin toggle
- On submit, open `SupportActionDialog` for audit reason
- On confirm, invoke `platform-support-action` with `CHANGE_USER_ROLE` and refresh memberships

