# Why Emily's permissions look ON but she can't approve

## What's actually in the database

Emily Stiles (`0befa074-...`) has one membership at **Haley Custom Homes** as **GC_PM**, with `is_admin = false`. Her `member_permissions` row stores:

| Column | Value |
|---|---|
| can_view_financials | **false** |
| can_approve_invoices | **false** |
| can_create_work_orders | **false** |
| can_create_pos | **false** |
| can_manage_team | **false** |
| can_submit_time | true |
| can_create_rfis | true |

So in the app she correctly cannot approve COs/invoices — the data is right.

## Why the Platform Owner page shows every toggle ON

Two layers collide:

1. **`UserPermissionsCard.getEffectiveValue`** falls back to the **role defaults** in `ROLE_PERMISSIONS` whenever the `member_permissions` row is `null`. For `GC_PM`, every default is `true`.
2. **RLS on `public.member_permissions`** only allows SELECT to users who share an organization with the target row:
   ```
   EXISTS (
     user_org_roles my_role
     JOIN user_org_roles target_role ON same organization
     WHERE my_role.user_id = auth.uid()
   )
   ```
   Oleg (Platform Owner) is **not** a member of Haley Custom Homes, so the query in `PlatformUserDetail.refreshData` returns zero rows. `permissionsMap[m.id]` becomes `null`, and the card renders the all-true GC_PM defaults.

The same RLS blocks the UPDATE policy ("Admins can update member permissions"), so any toggle change Oleg attempts from this page would also silently fail or 403 — the page can neither read nor write the real values.

## Fix

Allow platform staff to read and write `member_permissions` for any org, while preserving the existing org-scoped policies for normal users.

### Database

Add two RLS policies on `public.member_permissions` using the existing `is_platform_user(uid)` / `platform_users` table pattern already used elsewhere in the project:

- `SELECT`: allow when `EXISTS (SELECT 1 FROM platform_users WHERE user_id = auth.uid() AND platform_role <> 'NONE')`
- `UPDATE` / `INSERT`: same predicate, gated to roles with `canEditRecords` (PLATFORM_OWNER, PLATFORM_ADMIN, SUPPORT_AGENT — i.e. all non-NONE values today).

This mirrors how other admin-managed tables expose data to the platform console without changing tenant-facing RLS.

### Frontend (defensive only — no behavior change once RLS is fixed)

In `src/components/platform/UserPermissionsCard.tsx`, when `perms === null` for a non-admin membership, render the toggles as **disabled with a small "permissions unavailable" hint** instead of silently showing role defaults. This prevents a future RLS regression from ever again displaying false-positive ON states.

## Files touched

- New migration: RLS policies on `public.member_permissions` for platform users (SELECT + UPDATE + INSERT).
- `src/components/platform/UserPermissionsCard.tsx`: guard `getEffectiveValue` so a `null` perms row for a non-admin shows muted/disabled toggles with a tooltip, instead of role defaults.

## Verification

1. As Platform Owner, open Emily's profile → Permissions section should now show **View Financials / Approve Invoices / Create Work Orders / Create POs / Manage Team = OFF**, and **Submit Time / Create RFIs = ON**, matching the DB.
2. Toggle "Approve Invoices" ON, provide a reason → row updates, page re-fetches, toggle stays ON, support log entry written.
3. As a regular GC member of Haley Custom Homes, the existing org-scoped policies still apply (no regression).
