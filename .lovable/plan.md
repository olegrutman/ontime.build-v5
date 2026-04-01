

# Platform Setup Page — System-Wide Settings

## What This Is

A new `/platform/setup` page accessible from the platform sidebar. It gives platform owners a single place to manage system-wide defaults that apply across all organizations and projects — things like default plan assignment, platform branding, email settings, and global toggles.

Currently none of these settings exist in the codebase, so this page will introduce a new `platform_settings` table and a UI to read/write key-value pairs.

## Database

**New table: `platform_settings`**
- `id` (uuid, PK)
- `key` (text, unique) — e.g. `default_plan_id`, `platform_name`, `support_email`, `require_email_verification`, `allow_public_signup`, `maintenance_mode`
- `value` (jsonb) — stores the setting value (string, boolean, number, etc.)
- `updated_at` (timestamptz)
- `updated_by` (uuid, references auth.users)

RLS: Only platform users with PLATFORM_OWNER or PLATFORM_ADMIN role can read/write.

## New Files

| File | Purpose |
|------|---------|
| `src/pages/platform/PlatformSetup.tsx` | Page component with grouped settings cards |
| `src/hooks/usePlatformSettings.ts` | React Query hooks to fetch/upsert platform_settings |

## Settings Groups (UI Cards)

**General**
- Platform Name (text input)
- Support Email (text input)
- Maintenance Mode (toggle) — shows banner to all users when on

**Defaults**
- Default Subscription Plan (dropdown from existing plans)
- Auto-confirm Email Signups (toggle)
- Allow Public Signup (toggle)

**Branding**
- Primary Color (color picker or hex input)
- Logo URL (text input)

Each card has an inline "Save" button that upserts the changed keys.

## Wiring

- Add route `/platform/setup` in `App.tsx` wrapped in `RequirePlatformRole`
- Add nav item `{ to: '/platform/setup', icon: Settings, label: 'Setup' }` to `PlatformSidebar.tsx` NAV_ITEMS (before Support Logs)
- Page uses `PlatformLayout` with breadcrumbs like all other platform pages

## Files Modified

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/platform/setup` route |
| `src/components/platform/PlatformSidebar.tsx` | Add Setup nav item |
| `src/pages/platform/PlatformSetup.tsx` | New page |
| `src/hooks/usePlatformSettings.ts` | New hooks |
| Migration | Create `platform_settings` table with RLS |

