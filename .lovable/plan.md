

# Plan: Platform Owner — Create Organization & Assign Users

## Changes

### 1. Add `CREATE_ORGANIZATION` action to edge function
**File: `supabase/functions/platform-support-action/index.ts`**
- Add `CREATE_ORGANIZATION: "PLATFORM_OWNER"` to `ACTION_MIN_ROLE`
- Add case that:
  - Generates an `org_code` from the name (same logic as `complete_signup`)
  - Inserts into `organizations` table using admin client
  - Optionally adds an initial admin user (by email) to `user_org_roles` with `is_admin: true`
  - Returns the new org ID

### 2. Add RLS INSERT policy for platform users on `organizations`
**DB migration** — platform support action uses the service role key so this isn't strictly needed, but it's good practice. Actually, since the edge function uses `adminClient` (service role), no RLS changes are needed.

### 3. Add "Create Organization" dialog to PlatformOrgs page
**File: `src/pages/platform/PlatformOrgs.tsx`**
- Add a "Create Organization" button next to the search bar
- Dialog with fields: Name, Type (GC/TC/FC/SUPPLIER), optional Phone
- Optional "Initial Admin Email" field — if provided, that user is automatically added as admin
- On submit, calls the `SupportActionDialog` for audit reason, then invokes `platform-support-action` with `CREATE_ORGANIZATION`
- On success, refreshes the org list and navigates to the new org detail page

### 4. No other file changes needed
- Adding members to the new org is already supported via the existing "Add Member (No Verification)" button on the Org Detail page
- The existing `ALLOWED_ROLES_BY_ORG_TYPE` mapping handles role selection per org type

