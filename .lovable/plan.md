

# View & Edit User Permissions from Platform User Detail

## What to Build

Add a "Permissions" card on the Platform User Detail page that shows the effective permissions for each org membership, and lets Platform Owners toggle individual permission flags (with audit logging).

## Changes

### 1. Edge Function — `supabase/functions/platform-support-action/index.ts`

Add `EDIT_MEMBER_PERMISSIONS` action (min role: `PLATFORM_OWNER`):
- Accepts `user_org_role_id` and `permissions` object (the 7 boolean DB columns)
- Upserts the `member_permissions` row (insert if missing, update if exists)
- Snapshots before/after for audit log

### 2. UI — `src/pages/platform/PlatformUserDetail.tsx`

**Fetch permissions**: After loading memberships, also fetch `member_permissions` for each membership's `user_org_role_id`.

**New "Permissions" card** below the Organization Memberships card:
- For each membership, show a collapsible section with the org name
- Display each permission as a labeled Switch toggle:
  - `can_view_financials` — View Financials
  - `can_approve_invoices` — Approve Invoices
  - `can_create_work_orders` — Create Work Orders
  - `can_create_pos` — Create Purchase Orders
  - `can_submit_time` — Submit Time
  - `can_manage_team` — Manage Team
  - `can_create_rfis` — Create RFIs
- Show current effective value (merged from role defaults + DB overrides using `getEffectivePermissions`)
- Admin members show all toggles as checked & disabled with a note "Admin — all permissions granted"
- On toggle change, open SupportActionDialog for reason, then call `EDIT_MEMBER_PERMISSIONS`
- Refresh permissions data on success

### 3. No database migration needed

`member_permissions` table and RLS policies already exist. Platform users have SELECT access. The edge function uses the service role key to bypass RLS for writes.

