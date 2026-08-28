# In-App Account Deletion (Apple / Google compliance)

Today Settings has a "Delete Account" button, but confirming only shows a toast telling the user to email support. That does not satisfy Apple App Store 5.1.1(v) or Google Play's data-deletion policy. This plan makes deletion actually happen inside the app.

## What the user will see

1. Settings → Danger Zone → **Delete Account** (already reachable in-app).
2. Confirmation dialog: plain-English warning that deletion is permanent, a list of what gets removed, and a required "DELETE" typed confirmation.
3. If the user is the **only admin of an organization that still has other members or active projects**, the dialog explains they must transfer admin ownership first, and links to the team page instead of deleting. (Prevents orphaning a company's data.)
4. On confirm: progress state → account and data removed → user signed out → a full-screen **"Your account has been deleted"** page (public route, no auth) with a link back to the marketing site.

## What gets deleted vs anonymised

Hard-deleted (personal data):
- Auth record (the login itself), profile, user settings, notification preferences, push subscriptions
- Org/project memberships and roles, per-user permissions, project members/participants/guests
- Notifications, notification reads/deliveries, reminders, unread state
- Field captures, daily-log entries, CO/WO photos and evidence the user uploaded, plus the underlying files in storage
- Pending invitations the user sent or received
- If the user is the sole member of their organization and it has no projects: the organization and its settings are removed too.

Anonymised (retained for accounting/audit integrity — invoices, purchase orders, change orders, contracts, audit and access logs must stay intact for the counterparties who share those records):
- Author/approver/actor references on invoices, POs, change orders, labor entries, activity feeds, audit logs are repointed to a neutral "Deleted user" marker; the user id is cleared so rows can no longer be linked back to the person.
- No name, email, or phone is left on those rows.

## Technical approach

**Database**
- Add a `deleted_users` free ledger? No — instead add a single migration that creates `public.delete_own_account()` as a `SECURITY DEFINER` function, plus an internal `public.anonymize_user_references(_user_id uuid)` helper. The function runs in one transaction: guard checks (sole-admin rule), anonymise the retained tables, delete the personal-data tables, then `delete from auth.users` is **not** done here (auth schema is off-limits from SQL) — see edge function.
- Grant execute to `authenticated` only; the function derives the user from `auth.uid()` so one user can never delete another.

**Edge function `delete-account`**
- Validates the caller's JWT in code, extracts the user id.
- Calls `delete_own_account()` via the service-role client for the data cascade.
- Removes the user's storage objects under their id prefix in the private buckets.
- Finally calls the Admin API `auth.admin.deleteUser(userId)` so the login record is genuinely gone.
- Returns `{ ok: true }`, or a typed error (`sole_admin`, `has_active_projects_as_admin`) that the dialog renders as guidance.

**Frontend**
- New `src/components/settings/DeleteAccountDialog.tsx`: warning copy, "what happens" list, typed confirmation, blocking states, error mapping.
- `src/pages/Settings.tsx`: replace the toast-only handler with the dialog; drop the `hasActiveProjects` hard disable (the server decides, and active project membership alone should not block a normal member from leaving).
- New public route `/account-deleted` → `src/pages/AccountDeleted.tsx`; on success we sign out locally and navigate there.
- Add a short "Delete your account" section to the Privacy Policy page describing the flow, which is what the store reviewers look for.

## Notes
- Deletion is immediate and irreversible — no 30-day grace window, since that is simplest to defend in review. Say so in the dialog.
- Any owner/platform-staff account (`platform_users`) is refused with a clear message; those are internal accounts.
