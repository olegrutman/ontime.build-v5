

# Add New User & Assign to Organization — from Platform Users Page

## What Already Exists
- The backend edge function `platform-support-action` already has a `CREATE_USER_AND_ADD` action that creates an auth user, profile, and optionally assigns to an org with a role.
- The `useSupportAction` hook can invoke it.
- The `AssignToOrgDialog` pattern (org search, role picker, reason dialog) can be reused.

## What Needs to Be Built

### 1. New `CreateUserDialog` component
**File**: `src/components/platform/CreateUserDialog.tsx`

A dialog with:
- **Email** (required)
- **First Name** / **Last Name** fields
- **Password** (required, auto-generate option or manual entry)
- **Organization assignment** (optional) — reuse the same org search + role picker pattern from `AssignToOrgDialog`
- **Reason** step via `SupportActionDialog` before confirming

Calls `useSupportAction` with `action_type: 'CREATE_USER_AND_ADD'` and params: `email`, `password`, `first_name`, `last_name`, `full_name`, `organization_id`, `role`.

### 2. Add "Create User" button to `PlatformUsers.tsx`
Add a button next to the search bar (e.g., `+ Add User`) that opens `CreateUserDialog`. On success, refresh the user list.

### 3. Update `SupportActionType` in `src/types/platform.ts`
Add `'CREATE_USER_AND_ADD'` to the `SupportActionType` union and `ACTION_TYPE_LABELS` map so audit logs display correctly.

## Summary

| File | Change |
|---|---|
| `src/components/platform/CreateUserDialog.tsx` | New dialog: user creation form + optional org assignment + reason |
| `src/pages/platform/PlatformUsers.tsx` | Add "Add User" button, wire to dialog |
| `src/types/platform.ts` | Add `CREATE_USER_AND_ADD` to type union and labels |

