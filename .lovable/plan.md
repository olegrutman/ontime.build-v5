

# Phase 3: Support Tools + Phase 4: Impersonation

## Overview

Phase 3 adds actionable support tools to the existing platform detail pages (User Detail, Org Detail, Project Detail). Phase 4 adds the "Login As" impersonation feature with session management, timeout, and a persistent banner.

---

## Phase 3: Support Tools

### 3A. Edge function: `platform-support-action`

A single edge function that handles all support actions server-side using the service role key. Actions are dispatched by `action_type` parameter. Each action:
- Validates the caller is a platform user (via `get_platform_role` RPC)
- Checks permission tier (Owner/Admin/Agent) against the action
- Executes the action
- Logs via `log_support_action` RPC
- Returns result

Supported actions:
| Action | What it does | Min role |
|--------|-------------|----------|
| `RESEND_INVITE` | Re-sends a project invite email | SUPPORT_AGENT |
| `FORCE_ACCEPT_PROJECT` | Sets `project_team.accepted = true` | SUPPORT_AGENT |
| `ADD_MEMBER_NO_VERIFICATION` | Creates `user_org_roles` row directly | SUPPORT_AGENT |
| `RESET_PASSWORD_LINK` | Calls `auth.admin.generateLink('recovery')` | SUPPORT_AGENT |
| `CHANGE_USER_EMAIL` | Calls `auth.admin.updateUserById` + updates profiles | PLATFORM_ADMIN |
| `REBUILD_PERMISSIONS` | Deletes and re-creates `member_permissions` for an org | PLATFORM_ADMIN |
| `UNLOCK_RECORD` | Updates a locked PO/Invoice/WO status back to editable | SUPPORT_AGENT |

### 3B. UI: Support action buttons on detail pages

**PlatformUserDetail** — add action buttons:
- "Reset Password" — triggers `RESET_PASSWORD_LINK`
- "Change Email" — opens input dialog, triggers `CHANGE_USER_EMAIL`

**PlatformOrgDetail** — add action buttons:
- "Add Member (No Verification)" — opens dialog for email + role, triggers `ADD_MEMBER_NO_VERIFICATION`
- "Rebuild Permissions" — triggers `REBUILD_PERMISSIONS`

**PlatformProjectDetail** — add action buttons:
- "Force Accept" (per pending team row) — triggers `FORCE_ACCEPT_PROJECT`

All actions use the existing `SupportActionDialog` component for the mandatory reason input.

### 3C. Hook: `useSupportAction`

A shared hook that:
1. Invokes the `platform-support-action` edge function
2. Shows toast on success/error
3. Returns `{ execute, loading }` 

---

## Phase 4: Impersonation ("Login As")

### 4A. Edge function: `platform-impersonate`

Two operations:
- **start**: Generates a magic link for the target user via `auth.admin.generateLink('magiclink')`, logs `LOGIN_AS_USER_START`, updates `platform_users.last_impersonation_at`. Returns the magic link token.
- **end**: Logs `LOGIN_AS_USER_END`. Frontend handles session swap back.

Security:
- Only `PLATFORM_OWNER` and `PLATFORM_ADMIN` can impersonate (not SUPPORT_AGENT for other platform users)
- Cannot impersonate other platform users unless caller is PLATFORM_OWNER
- 30-minute session timeout enforced client-side

### 4B. Impersonation session state

Store in `sessionStorage`:
- `impersonation_original_session` — the platform user's refresh token
- `impersonation_target_email` — display in banner
- `impersonation_started_at` — for 30-min timeout

New hook: `useImpersonation` that:
- Exposes `isImpersonating`, `targetEmail`, `startImpersonation(userId)`, `endImpersonation()`
- On `endImpersonation`: restores the original session, clears sessionStorage, navigates to `/platform`
- Runs a timer that auto-ends after 30 minutes of inactivity

### 4C. Impersonation banner

A persistent top banner (similar to `DemoBanner`) shown when `isImpersonating === true`:
- Yellow/amber background
- Text: "Viewing as {email} — Support Session"
- "End Session" button
- Countdown timer showing remaining time

Rendered in `AppRoutes` component above the `ErrorBoundary`.

### 4D. "Login As" button on PlatformUserDetail

Button on the user detail page that:
1. Opens `SupportActionDialog` for reason
2. Calls `platform-impersonate` edge function with `start`
3. Stores current session in sessionStorage
4. Sets the new session via `supabase.auth.setSession()`
5. Navigates to `/dashboard`

---

## File Changes Summary

| File | Change |
|------|--------|
| `supabase/functions/platform-support-action/index.ts` | **New** — edge function for all support tools |
| `supabase/functions/platform-impersonate/index.ts` | **New** — edge function for impersonation start/end |
| `supabase/config.toml` | Add function entries (verify_jwt = false) |
| `src/hooks/useSupportAction.ts` | **New** — shared hook for invoking support actions |
| `src/hooks/useImpersonation.ts` | **New** — impersonation session management + timer |
| `src/components/platform/ImpersonationBanner.tsx` | **New** — persistent top banner during impersonation |
| `src/pages/platform/PlatformUserDetail.tsx` | Add "Login As", "Reset Password", "Change Email" buttons |
| `src/pages/platform/PlatformOrgDetail.tsx` | Add "Add Member", "Rebuild Permissions" buttons |
| `src/pages/platform/PlatformProjectDetail.tsx` | Add "Force Accept" button per pending team row |
| `src/App.tsx` | Render `ImpersonationBanner` |

