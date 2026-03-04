

# Add Remove Member + Analyze Permissions & Admin Transfer

## Current State Analysis

### Permissions System
The permission system is well-structured with two layers:
1. **Role-based defaults** (`ROLE_PERMISSIONS` in `types/organization.ts`) — baseline per role (GC_PM, TC_PM, FC_PM, FS, SUPPLIER)
2. **Granular DB overrides** (`member_permissions` table) — per-member toggles that override role defaults
3. **Admin override** — `is_admin = true` grants ALL permissions automatically

Six permission flags exist in the DB:
- `can_approve_invoices`, `can_create_work_orders`, `can_create_pos`, `can_manage_team`, `can_view_financials`, `can_submit_time`

The `MemberDetailDialog` lets admins toggle these per member. The `getEffectivePermissions()` function merges role defaults + DB overrides + admin override correctly.

### Admin Transfer
- Works via `transfer_admin` RPC — sets `is_admin = false` on caller, `is_admin = true` on target
- UI has a confirmation dialog with clear warning
- After transfer, the former admin loses the ability to manage permissions/transfers

### Bugs Found
1. **No "Remove Member" capability** — admins cannot remove team members from their organization. There's no RPC or UI for it.
2. **Permissions not initialized for members without a `member_permissions` row** — when a member has no row in `member_permissions`, the dialog shows all toggles as `false` (line 78 condition: `member?.permissions && Object.keys(localPerms).length === 0`). If `member.permissions` is `null`, the permissions section is skipped entirely and no toggles appear. This means admins can't set permissions for members who haven't had them set before.
3. **After admin transfer, auth context is stale** — `refreshUserData()` isn't called after `handleTransfer`, so the former admin's UI still shows admin controls until they refresh the page.

## Changes

### 1. Database: Create `remove_org_member` RPC
Create a `SECURITY DEFINER` function that:
- Validates the caller is admin of the same org
- Prevents removing yourself
- Prevents removing the admin (must transfer first)
- Deletes the `member_permissions` row (cascade should handle, but explicit)
- Deletes the `user_org_roles` row

### 2. `src/hooks/useOrgTeam.ts` — Add `removeMember` function
Add a new function that calls the `remove_org_member` RPC and refreshes the member list.

### 3. `src/components/team/MemberDetailDialog.tsx` — Add Remove button + fix bugs
- Add a "Remove from Team" section with confirmation dialog (destructive action)
- Accept `onRemoveMember` prop
- Fix: when `member.permissions` is `null`, initialize `localPerms` from role defaults so admin can still set permissions
- Fix: after admin transfer, call `refreshUserData` via a new callback prop

### 4. `src/pages/OrgTeam.tsx` — Wire up remove member
- Pass `onRemoveMember` handler to `MemberDetailDialog`
- After removal, refetch the members list

### Summary of deliverables
- Admin can remove non-admin members from the org
- Permissions toggles work even for members with no existing `member_permissions` row
- Auth context refreshes after admin transfer
- Remove is blocked for self and for the admin (must transfer first)

