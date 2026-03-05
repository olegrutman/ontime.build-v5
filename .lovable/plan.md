

# Platform Admin Portal — Implementation Plan

This is a large feature spanning database schema, auth system changes, new routes, and a full admin UI. It will be implemented in **4 phases** to keep each step testable and avoid breaking existing flows.

---

## Phase 1: Data Model + Auth Layer

### Database Changes

**1. New enum: `platform_role`**
```sql
CREATE TYPE public.platform_role AS ENUM ('NONE', 'PLATFORM_OWNER', 'PLATFORM_ADMIN', 'SUPPORT_AGENT');
```

**2. New table: `platform_users`** (separate from profiles — no modification to existing auth tables)
- `id uuid PK`
- `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE, UNIQUE`
- `platform_role platform_role NOT NULL DEFAULT 'NONE'`
- `two_factor_verified boolean DEFAULT false`
- `last_impersonation_at timestamptz`
- `created_at / updated_at`

RLS: Only platform users can SELECT. No public INSERT/UPDATE/DELETE — managed via SECURITY DEFINER RPCs only.

**3. New table: `support_actions_log`**
- `id uuid PK`
- `created_at timestamptz DEFAULT now()`
- `created_by_user_id uuid NOT NULL` (platform user)
- `created_by_name text`
- `created_by_email text`
- `target_org_id uuid` (nullable)
- `target_org_name text`
- `target_project_id uuid` (nullable)
- `target_project_name text`
- `target_user_id uuid` (nullable)
- `target_user_email text`
- `action_type text NOT NULL` (using text with app-level validation rather than enum, for extensibility)
- `action_summary text`
- `reason text NOT NULL`
- `before_snapshot jsonb`
- `after_snapshot jsonb`

RLS: Platform users can INSERT and SELECT. No UPDATE or DELETE (append-only).

**4. SECURITY DEFINER function: `is_platform_user(uuid)`**
Returns the platform_role for a given user_id, bypassing RLS. Used in RLS policies and route guards.

**5. SECURITY DEFINER function: `log_support_action(...)`**
Validates caller is a platform user, then inserts into `support_actions_log`. All support tools call this.

### Auth Context Changes (`useAuth.tsx`)

- After fetching `userOrgRoles`, also fetch from `platform_users` table
- Add to context: `platformRole: PlatformRole | null`, `isPlatformUser: boolean`, `twoFactorVerified: boolean`
- Add new type `PlatformRole = 'NONE' | 'PLATFORM_OWNER' | 'PLATFORM_ADMIN' | 'SUPPORT_AGENT'`

### Route Protection

- New `RequirePlatformRole` component (similar to `RequireAuth`)
- Checks `platformRole` is not NONE
- If platform user but `!twoFactorVerified`, shows 2FA setup screen (placeholder flow with admin toggle for now)
- Permission tiers enforced at component level

### New Types (`src/types/platform.ts`)
- `PlatformRole`, `PlatformUser`, `SupportActionLog`, `SupportActionType` (string union)
- Permission maps per tier

---

## Phase 2: Platform Portal UI (Core Pages)

All under `/platform/*` routes, using a dedicated `PlatformLayout` component (no org sidebar — its own minimal sidebar with: Home, Orgs, Users, Logs, sign out).

### Pages to Create

**`/platform` — Dashboard**
- Global search bar (org name, project name, user email)
- Tile cards: Organizations, Projects, Users, Support Logs
- Active impersonation indicator tile

**`/platform/orgs` — Organizations List**
- Table: Name, Type (GC/TC/FC/SUPPLIER), # Projects, # Users, Last Activity
- Click → org detail

**`/platform/orgs/:orgId` — Org Detail**
- Org summary card
- Members list with roles
- Projects list
- Quick Actions panel (Phase 3)

**`/platform/users` — Users Search**
- Search by email/name
- Results show org memberships
- Links to impersonate, reset password

**`/platform/users/:userId` — User Detail**
- Profile info, org memberships, recent activity
- Actions: impersonate, send password reset, change email (admin only)

**`/platform/projects/:projectId` — Project Detail**
- Project summary, team, contracts
- Links to POs, Invoices, Work Orders
- Quick Actions panel (Phase 3)

**`/platform/logs` — Support Logs**
- Filterable table: date range, platform user, org, project, action type
- Detail view with before/after JSON snapshots
- Append-only (no edit/delete UI)

### Sidebar & Layout
- Separate `PlatformSidebar` with platform-specific nav
- Always show context breadcrumb (which org/project you're viewing)
- Desktop-first, dense layout

---

## Phase 3: Support Tools & Quick Actions

### Org-Level Actions
- **Add member without verification**: Creates auth user + profile + user_org_role in one RPC. Logs `ADD_MEMBER_NO_VERIFICATION`.
- **Resend invitation**: Calls existing invite resend logic. Logs `RESEND_INVITE`.
- **Rebuild permissions**: Drops and recreates `member_permissions` rows from role defaults. Logs `REBUILD_PERMISSIONS`.

### Project-Level Actions
- **Force accept project**: Sets participant acceptance to true. Logs `FORCE_ACCEPT_PROJECT`.
- **Edit project setup**: Modal with editable fields (name, address, material responsibility). Logs `EDIT_PROJECT_SETUP` with before/after.

### Record Actions (Invoice, PO, Work Order)
- **Unlock record**: Flips locked state, logs `UNLOCK_RECORD`.
- **Edit record**: Opens existing edit UI but requires reason. Saves `beforeSnapshot`/`afterSnapshot`. Marks record with `edited_by_support = true`, `edited_by_support_at`, `edited_by_support_user_id`.

All actions require a reason text input + confirmation modal. Each calls `log_support_action` RPC.

### Database additions for record tracking
- Add columns to `purchase_orders`, `invoices`, `work_items`: `edited_by_support boolean DEFAULT false`, `edited_by_support_at timestamptz`, `edited_by_support_user_id uuid`
- Display "Edited by Ontime Support" badge in normal app UI when these flags are set

---

## Phase 4: Impersonation

### Implementation
- **RPC `start_impersonation(target_user_id, reason)`**: Validates caller is platform user, target is not a platform user (for Support Agents), logs `LOGIN_AS_USER_START`, returns a signed impersonation token (JWT claim or stored session record).
- **New table `impersonation_sessions`**: `id, platform_user_id, target_user_id, started_at, expires_at (30 min), ended_at`
- **Auth context**: Add `impersonatingAs` state. When active, queries use the target user's ID for data access but the platform user's ID for audit.
- **Persistent banner**: `ImpersonationBanner` component rendered at top of app when `impersonatingAs` is set. Shows target email + "End Session" button.
- **End session**: Clears impersonation state, logs `LOGIN_AS_USER_END`, navigates back to `/platform`.
- **Auto-expiry**: Client-side timer checks `expires_at`. If expired, auto-ends session.

### Safety
- Support Agents cannot impersonate Platform users
- All impersonation sessions are logged with reason
- 30-minute inactivity timeout

---

## Files Created/Modified Summary

### New Files (~15-20)
- `src/types/platform.ts`
- `src/hooks/usePlatformAuth.ts`
- `src/hooks/useSupportLogs.ts`
- `src/hooks/usePlatformSearch.ts`
- `src/components/platform/PlatformLayout.tsx`
- `src/components/platform/PlatformSidebar.tsx`
- `src/components/platform/RequirePlatformRole.tsx`
- `src/components/platform/ImpersonationBanner.tsx`
- `src/components/platform/SupportActionDialog.tsx` (reason + confirm)
- `src/components/platform/SupportBadge.tsx` (for "Edited by Support" display)
- `src/pages/platform/PlatformDashboard.tsx`
- `src/pages/platform/PlatformOrgs.tsx`
- `src/pages/platform/PlatformOrgDetail.tsx`
- `src/pages/platform/PlatformUsers.tsx`
- `src/pages/platform/PlatformUserDetail.tsx`
- `src/pages/platform/PlatformProjectDetail.tsx`
- `src/pages/platform/PlatformLogs.tsx`

### Modified Files
- `src/hooks/useAuth.tsx` — fetch platform_users, add platformRole to context
- `src/App.tsx` — add `/platform/*` routes with `RequirePlatformRole` guard + `ImpersonationBanner`
- Various detail components (PO, Invoice, Work Order) — show "Edited by Support" badge when flags are set

### Database Migrations
- Create `platform_role` enum, `platform_users` table, `support_actions_log` table, `impersonation_sessions` table
- Create RPCs: `is_platform_user`, `log_support_action`, `start_impersonation`, `end_impersonation`
- Add `edited_by_support*` columns to POs, invoices, work_items
- RLS policies for all new tables

---

## Implementation Order

I recommend implementing **Phase 1 + Phase 2** first (data model + portal UI with read-only views), then **Phase 3** (support tools), then **Phase 4** (impersonation) — each as a separate approval cycle so we can test incrementally.

Shall I proceed with Phase 1 + Phase 2?

