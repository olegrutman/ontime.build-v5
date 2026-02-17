

# Admin Designation and Member Permissions System

## Overview
Replace the current role-based "admin" assumption with an explicit `is_admin` flag on each team member. Admins can manage granular permissions for their team members through a detail popup on the My Team page.

## Database Changes

### 1. Add `is_admin` column to `user_org_roles`
- Add `is_admin BOOLEAN NOT NULL DEFAULT false` to `user_org_roles`
- Set the organization creator as admin: update existing rows where `user_id = organizations.created_by`

### 2. Create `member_permissions` table
Stores per-member granular permission overrides:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | |
| user_org_role_id | uuid (FK) | Links to `user_org_roles.id` |
| can_approve_invoices | boolean | Default false |
| can_create_work_orders | boolean | Default false |
| can_create_pos | boolean | Default false |
| can_manage_team | boolean | Default false |
| can_view_financials | boolean | Default false |
| can_submit_time | boolean | Default true |
| updated_at | timestamptz | |

- RLS: only members of the same org can read; only admins can update
- Auto-create a row via trigger when a `user_org_roles` row is inserted

### 3. Create `transfer_admin` RPC
A `SECURITY DEFINER` function that:
- Validates current user is the admin
- Removes `is_admin` from current user
- Sets `is_admin = true` on the target member
- Only one admin per org at a time

### 4. Create `update_member_permissions` RPC
A `SECURITY DEFINER` function that:
- Validates caller is the org admin
- Updates the `member_permissions` row for the given member

### 5. Fix `search_organizations_for_join`
Update the admin_name subquery to select only users where `is_admin = true` instead of filtering by role, so "John Smith" (the actual admin) shows up instead of "Allen Rutman" (office manager).

## Frontend Changes

### 1. Profile Page (`src/pages/Profile.tsx`)
- Show an "Admin" badge next to the user's name/role if they are the org admin

### 2. My Team Page (`src/pages/OrgTeam.tsx`)
- Show an "Admin" badge next to the admin member in the members list
- When the current user is admin and clicks on a team member row, open a **Member Detail Dialog**

### 3. New Component: `MemberDetailDialog`
A dialog/sheet that shows when an admin clicks a team member, containing:
- Member name, email, job title, role
- **Permissions section** with toggle switches for each permission:
  - Approve Invoices
  - Create Work Orders
  - Create Purchase Orders
  - Manage Team
  - View Financials
  - Submit Time
- **Transfer Admin** button (with confirmation) to make this member the new admin
- Save button to persist permission changes

### 4. Update `useOrgTeam` hook
- Fetch `is_admin` field alongside member data
- Fetch `member_permissions` for each member
- Add `updateMemberPermissions` and `transferAdmin` functions

### 5. Update `useAuth` hook
- Include `is_admin` in the `userOrgRoles` fetch so it's available app-wide
- Update the `UserOrgRole` type in `src/types/organization.ts` to include `is_admin`

## Technical Details

### Migration SQL (summary)

```text
1. ALTER TABLE user_org_roles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
2. UPDATE user_org_roles SET is_admin = true WHERE user_id IN (SELECT created_by FROM organizations WHERE created_by IS NOT NULL) AND organization_id IN (SELECT id FROM organizations WHERE created_by = user_org_roles.user_id);
3. CREATE TABLE member_permissions (...)
4. CREATE TRIGGER to auto-create member_permissions on user_org_roles insert
5. Backfill member_permissions for existing rows
6. CREATE FUNCTION transfer_admin(...)
7. CREATE FUNCTION update_member_permissions(...)
8. RLS policies on member_permissions
9. Update search_organizations_for_join to use is_admin
```

### Files to create/modify

| File | Action |
|------|--------|
| Migration SQL | Create: schema changes + RPCs |
| `src/types/organization.ts` | Add `is_admin` to `UserOrgRole`, add `MemberPermissions` interface |
| `src/hooks/useAuth.tsx` | Ensure `is_admin` flows through from query |
| `src/hooks/useOrgTeam.ts` | Fetch `is_admin` + permissions, add mutation functions |
| `src/components/team/MemberDetailDialog.tsx` | New: permission toggles + transfer admin |
| `src/pages/OrgTeam.tsx` | Add admin badge, click handler to open dialog |
| `src/pages/Profile.tsx` | Show admin badge |

