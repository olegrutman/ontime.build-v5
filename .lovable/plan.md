

# Implementation Plan: 5 Feature Bundle

This plan covers all five requested features in a logical build order, since some features depend on others (e.g., activity logging triggers feed the notification preferences system).

---

## 1. Activity / Audit Log (Real Event Logging)

**What it does:** Automatically records key project events (status changes, approvals, scope edits, team changes) into the existing `project_activity` table via database triggers -- no manual logging code needed.

**Current state:** The `project_activity` table and `ProjectActivitySection` UI component already exist and render activity items. But no triggers populate the table automatically.

**Changes:**

- **Database migration** -- Create PostgreSQL trigger functions on these tables:
  - `change_order_projects` (status changes: submitted, approved, rejected)
  - `project_participants` (invite accepted/declined)
  - `projects` (status changes, scope updates)
  - `invoices` (submitted, approved, rejected)
  - Each trigger inserts a row into `project_activity` with `activity_type`, `description`, actor info (looked up from `profiles`), and relevant metadata
- **No frontend changes needed** -- `ProjectActivitySection` already queries `project_activity` and renders by type with icons/colors. The existing realtime subscription will show new entries live.

**Technical details:**
- Triggers use `AFTER UPDATE` / `AFTER INSERT` on the relevant tables
- Actor identity resolved by joining `auth.uid()` to `profiles` for `actor_name` and to `user_org_roles` + `organizations` for `actor_company`
- Each trigger checks `OLD.status != NEW.status` to avoid duplicate logging on non-status updates

---

## 2. Notification Preferences (Per-Event Channel Control)

**What it does:** Replaces the current coarse notification toggles (email on/off, change orders on/off) with granular per-event controls letting users pick email vs. in-app for each event type.

**Current state:** `user_settings` has 5 boolean columns (`notify_email`, `notify_sms`, `notify_change_orders`, `notify_invoices`, `notify_invites`). The `send-notification-email` edge function already checks these columns before sending.

**Changes:**

- **Database migration** -- Add new columns to `user_settings`:
  - `notify_work_order_assigned` (boolean, default true)
  - `notify_work_order_approved` (boolean, default true)
  - `notify_work_order_rejected` (boolean, default true)
  - `notify_invoice_submitted` (boolean, default true)
  - `notify_invoice_approved` (boolean, default true)
  - `notify_invoice_rejected` (boolean, default true)
  - `notify_project_invite` (boolean, default true)
  - `email_digest_frequency` (text, default 'instant') -- for future batched emails
- **Update Profile page** -- Replace the 5 switches with a structured section grouped by category (Work Orders, Invoices, Invitations), each with sub-toggles for individual events
- **Update `send-notification-email` edge function** -- Expand the `TYPE_TO_PREFERENCE` mapping to reference the new granular columns instead of the broad categories
- **Update `useProfile` hook** -- Add the new settings fields to the `UserSettings` interface

---

## 3. Dashboard Quick Stats (KPI Tiles)

**What it does:** Adds 3 compact stat tiles above the project list showing Open Work Orders, Pending Invoices, and Upcoming Reminders at a glance.

**Current state:** `useDashboardData` already fetches all the data needed (attentionItems with change_order/invoice counts, reminders). The dashboard just doesn't display these as KPIs.

**Changes:**

- **New component** -- `src/components/dashboard/DashboardQuickStats.tsx`
  - 3 compact tiles in a responsive grid (1 col mobile, 3 col desktop)
  - Tile 1: "Open Work Orders" -- count from `attentionItems.filter(type === 'change_order').length`
  - Tile 2: "Pending Invoices" -- count from `attentionItems.filter(type === 'invoice').length`  
  - Tile 3: "Reminders Due" -- count from `reminders` with `due_date <= 7 days from now`
  - Each tile is clickable, navigating to the relevant page
  - Uses existing `Card` component with icon, count, and label
- **Update Dashboard page** -- Insert `DashboardQuickStats` between the OrgInviteBanner and AttentionBanner
- **Update `useDashboardData`** -- Expose `reminders` (already fetched but may need to be returned -- it is already returned)

No database changes needed.

---

## 4. Export / Download Project Summary PDF

**What it does:** Adds a "Download Summary" button to the project page that generates a consolidated PDF with project info, financials, work order status breakdown, and billing summary.

**Changes:**

- **New edge function** -- `supabase/functions/project-summary-download/index.ts`
  - Accepts `project_id` as query param
  - Authenticates via JWT and verifies the user has access (is on the project team)
  - Fetches project details, contracts, work orders (with status counts), invoices (with totals), and team members
  - Generates a PDF using the same approach as existing `po-download` and `invoice-download` functions (HTML-to-PDF or manual PDF construction)
  - Returns the PDF as a downloadable response
- **New UI button** -- Add a "Download Summary" button to `ProjectTopBar` and `MobileProjectHeader`
  - On click, calls the edge function and triggers a browser download
  - Shows a loading spinner while generating

---

## 5. Onboarding Checklist

**What it does:** Shows a dismissible checklist card on the dashboard for new users guiding them through: (1) Complete profile, (2) Set up organization, (3) Invite a team member, (4) Create first project.

**Changes:**

- **Database migration** -- Add `onboarding_dismissed` boolean column to `user_settings` (default false)
- **New component** -- `src/components/dashboard/OnboardingChecklist.tsx`
  - Renders a Card with 4 checklist items, each with an auto-detected completion state:
    1. "Complete your profile" -- checked if `profile.first_name` and `profile.phone` exist
    2. "Set up organization details" -- checked if `organization.address?.street` exists
    3. "Invite a team member" -- checked if org has more than 1 member (query `user_org_roles` count)
    4. "Create your first project" -- checked if `projects.length > 0`
  - Each unchecked item links to the relevant page (Profile, Profile, Profile invite section, Create Project)
  - "Dismiss" button sets `onboarding_dismissed = true` in `user_settings`
  - Only shown when `user_settings.onboarding_dismissed !== true`
- **Update Dashboard page** -- Render `OnboardingChecklist` at the top of the dashboard (before quick stats), conditionally based on the dismissed flag
- **Update `useDashboardData`** or create a small `useOnboardingStatus` hook to check completion states

---

## Build Order

1. Activity/Audit Log triggers (no frontend changes, enables data for everything else)
2. Notification Preferences (database + Profile page + edge function update)
3. Dashboard Quick Stats (pure frontend, no DB changes)
4. Onboarding Checklist (small DB change + new component)
5. Export Project Summary PDF (new edge function + button)

