# Ontime.Build — Page-by-Page Problem List

**How to read this:** Every page you have is listed. Under each page is a numbered list of problems in plain English. You pick which numbers to fix.

**Severity in plain words:**
- **Blocker** — Broken, unsafe, leaks data, or loses money. Fix before real customers.
- **Embarrassing** — Works, but looks unfinished or unprofessional in a demo.
- **Rough edge** — Small polish issue.
- **Missing** — A feature that should exist but doesn't.

---

# PUBLIC / VISITOR PAGES

### Landing page (`/`)
Who sees it: Everyone (logged out)

1. **Rough edge** — Product name is written as "Ontime.Build" here but "OnTime.Build" on other pages. Pick one.
2. **Rough edge** — The "200+ construction teams" claim looks like placeholder copy.
3. **Rough edge** — The "60 seconds to get started" tagline is not honest — signup actually takes several minutes and email verification.
4. **Rough edge** — All landing sections load as one bundle. If one image or chunk fails, the whole page above the fold goes blank.
5. **Rough edge** — The canonical URL in the page head is hardcoded to `pm.ontime.build`, ignoring the custom domain.

---

### Sign in page (`/auth`)
Who sees it: Everyone (logged out)

1. **Blocker** — The phone tab shows a label that says "UI preview only" in production. Should not be visible to customers.
2. **Blocker** — Google sign-in redirects to the site root instead of the auth callback path. Users can land on the landing page still looking logged out.
3. **Embarrassing** — There is no `<form>` element. The Enter key only works when the cursor is in the password field, not the email field.
4. **Embarrassing** — When a user tries to sign in with an unverified email, the error message has no button to resend the verification link. They're stuck.

---

### Sign up page — old version (`/auth` register tab → `SignUpScreen`)
Who sees it: Everyone (logged out)

1. **Blocker** — The **phone signup path creates a real user with the fake email `phone-placeholder@ontime.build`**. The second person who tries phone signup gets "email already registered." Phone signup is 100% broken.
2. **Blocker** — The OTP code entry expects 8 digits, but the system sends 6-digit codes. No one can complete phone signup even if the fake email didn't block them.
3. **Blocker** — The "Terms of Service" and "Privacy Policy" links are dead — they're plain text styled to look like links. Legal exposure.
4. **Blocker** — The success screen after signup is rendered and then immediately overwritten by a redirect. Users never see the confirmation.
5. **Embarrassing** — After the phone signup fails, the app tells the user "phone signup not available yet" — but only *after* it already created the fake account in the database.

---

### Sign up page — new version (`/signup` → wizard)
Who sees it: Everyone (logged out)

1. **Blocker** — The "Terms" and "Privacy" links are `<span>` elements styled like links with no click behavior. Same legal exposure as the old flow.
2. **Blocker** — There are **two entirely different signup flows** running side by side (`/auth` and `/signup`) with different password rules (6 characters here, 8 characters there) and different database calls. Users get different products depending on which URL they arrive at.
3. **Embarrassing** — If a user clicks "Back" from the Company step after their account was created, the app leaves an orphaned account in the database with no company attached.
4. **Embarrassing** — The "Pending approval" step (waiting for an admin to accept their join request) has no auto-refresh or notification. The user waits forever staring at a spinner.
5. **Embarrassing** — Sidebar shows "V1" — an internal version label that should not ship.

---

### Verify email page (`/verify-email`)
Who sees it: Users who just signed up

1. **Rough edge** — The "Go back" link always sends users to `/signup` even if they came from the `/auth` flow. They land on the wrong signup screen.
2. **Rough edge** — Product name written as "OnTime.Build" here (inconsistent with landing).

---

### Reset password page (`/reset-password`)
Who sees it: Users clicking the "forgot password" email link

1. **Embarrassing** — There are **two reset-password implementations** in the codebase. One is dead code that's never used. Pick one.

---

### Forgot password screen (`/auth` → "forgot")
Who sees it: Everyone (logged out)

1. **Embarrassing** — No email format validation. If you submit an empty field, the app confirms "email sent" — a false confirmation.

---

### Auth callback page (`/auth/callback`)
Who sees it: Users returning from email verification or Google sign-in

1. **Rough edge** — Auto-redirects after 1.5 seconds with no manual "Continue" link. Users on slow connections may see it flash and vanish.

---

### Legal pages (`/terms`, `/privacy`, `/security`)
Who sees it: Everyone

1. **Rough edge** — The "last updated" date is set to **May 21, 2026** — a future date.
2. **Rough edge** — Canonical URL hardcoded to `pm.ontime.build`.
3. **Rough edge** — Privacy policy claims Delaware governing law — confirm this is actually true for your entity.

---

### Unsubscribe page (`/unsubscribe`)
Who sees it: Anyone with an unsubscribe link

1. **Rough edge** — There is no way to re-subscribe after clicking. If someone unsubscribes by mistake, they can't undo it in the UI.
2. **Rough edge** — A button is permanently disabled with no explanation for why.

---

### External CO approval link (`/external/co-approve/:token`)
Who sees it: Homeowners / external approvers via email link

1. **Embarrassing** — On submission failure the app uses a browser `alert()` pop-up ("Failed to submit. Please try again."). Looks like a 2005 website.
2. **Embarrassing** — There is no Ontime branding on the external page. Homeowners have no trust signal that this is a legitimate business tool.
3. **Rough edge** — Accepts a single character as a "signature."

---

### External CO view (`/external/co/:token`)
Who sees it: External viewers

1. **Rough edge** — Email field accepts anything, no format validation.
2. **Rough edge** — No branding (same as approval page).

---

### 404 / Not Found
Who sees it: Anyone hitting a bad URL

1. **Rough edge** — Generic 404 page with no navigation help back to the app or dashboard.

---

# GENERAL CONTRACTOR (GC) PAGES

### GC Dashboard (`/dashboard`)
Who sees it: GC users

1. **Blocker** — The "I'm part of a team" / "I work solo" toggle is **inverted**. Clicking "I'm part of a team" marks the user as a solo operator in the database. Affects 5 different code paths.
2. **Embarrassing** — Archive, Complete, and "Add Reminder" dialogs are on the page but their buttons are wired to a different render path. GCs cannot actually archive projects or add reminders from their dashboard.
3. **Embarrassing** — Two KPI cards animate at the exact same time because they share the same animation index. Looks glitchy.
4. **Rough edge** — Organization type is hardcoded as the string "GC" in two spots instead of read from the user's real org.

---

### Create project wizard (`/create-project`)
Who sees it: GC users (and TC users)

1. **Embarrassing** — 7 steps to create a project. Procore does this in 3. Users will drop off.
2. **Embarrassing** — For TC creators, the "Next" button requires **both** a GC contract value **and** an FC contract value on day one. In reality neither may be known yet — this blocks onboarding.

---

### Finish project setup wizard (`/finish-project-setup`)
Who sees it: GC users returning to complete setup

1. **Embarrassing** — This is a **second 7-step wizard** that duplicates and slowly diverges from the main create-project wizard. Two sources of truth.
2. **Embarrassing** — No "Cancel" confirmation — one wrong click loses progress. (The other wizard has one.)

---

### Edit project scope page
Who sees it: GC users editing an existing project

1. **Rough edge** — The whole page is a single 909-line file. Slow to load and hard to maintain.

---

### GC Project Overview (`/project/:id/gc-overview`)
Who sees it: GC users

1. **Blocker** — **The entire page is hardcoded mock data on a live URL.** It shows a fake project called "5 Cherry Hills Park" and a fake contractor "Derek Kowalski" to any GC who lands here. The "Save Contract Changes" button just prints to the console — it does not save anything.
2. **Blocker** — The "✓ Approve — $18,400" button fires immediately with no confirmation. One misclick approves an $18,400 change order.
3. **Embarrassing** — The page has **106 inline style objects** built around a custom color palette that bypasses the design system entirely. Dark mode does not work here.

---

### Project home / hub (`/project/:id`)
Who sees it: All roles

1. **Embarrassing** — No back-to-dashboard breadcrumb on desktop. Once you're in a project you have to use the browser back button.
2. **Embarrassing** — Sidebar navigation shows no active state when you're inside a project. The sidebar becomes decorative during the user's main workflow.
3. **Embarrassing** — Loads project data with sequential database calls one after another instead of in parallel. Page feels slow.
4. **Rough edge** — Sidebar left margin is hardcoded pixel values, breaks on unusual screen sizes.

---

### SOV / Schedule of Values pages
Who sees it: GC, TC (partially)

1. **Blocker** — The **rich SOV page with CSV export, lock/unlock, and history is loaded in code but has no route pointing at it**. It is completely unreachable from the app. Users only get the basic version.

---

### Change Orders list (`/change-orders`)
Who sees it: GC, TC, FC (different views)

1. **Rough edge** — No skeleton loading state — flashes blank before data appears.

---

### CO Detail page (`/change-orders/:id`)
Who sees it: GC, TC, FC

1. **Blocker** — The status dropdown in the header does nothing — the change handler is never passed down to it. Users think they've changed the status but nothing saves.
2. **Rough edge** — No skeleton on load.

---

### Purchase Orders page (`/purchase-orders`)
Who sees it: GC, Supplier

1. **Blocker** — Uses a native browser `confirm()` pop-up when deleting a PO. This is irreversible — should be a typed confirmation dialog, not a browser alert.
2. **Blocker** — The "Work Item" dropdown in the New PO form is always empty because the underlying table was removed, but the field still ships. Validation lets orphan POs through.
3. **Blocker** *(Supplier view)* — The suppliers list is fetched with no organization filter. Any buyer sees every supplier's email addresses.
4. **Rough edge** — "Approved" and "Fulfilled" statuses use the same badge color — visually indistinguishable.
5. **Rough edge** — Not linked from the desktop sidebar or mobile bottom nav. Users have to know to type "purchase orders" into the command palette.

---

### Invoices / Payment Applications (`/payment-applications`)
Who sees it: GC

1. **Embarrassing** — The generated PDFs are built from change orders only. A real AIA G702/G703 pay application needs SOV line items, % complete, retainage, and net calculations. **Owners will reject these documents.**
2. **Rough edge** — No skeleton on load.

---

### Financials page (`/financials`)
Who sees it: GC, TC, FC

1. **Rough edge** — Not linked from the mobile bottom nav.

---

### RFIs list (`/rfis`)
Who sees it: GC

1. **Blocker** — GCs with no projects yet see a completely blank page — the page silently picks the first project in the list, and if there is none, renders nothing.
2. **Rough edge** — Not linked from the desktop sidebar.

---

### RFI Detail page (`/rfis/:id`)
Who sees it: GC

1. **Blocker** — If the RFI ID doesn't exist, the page shows an infinite spinner with no escape. No 404, no back button.

---

### Team / Org Team page (`/team`)
Who sees it: GC, TC admins

1. **Missing** — Only manages internal org members. There is no way to invite a TC or Supplier **company** to a project from here. Procore and Buildertrend make Directory a first-class module.
2. **Rough edge** — "My Team" is buried in the "More" drawer on mobile for GC admins.

---

### Partner Directory (`/partners`)
Who sees it: GC

1. **Rough edge** — No empty state or CTA for new GCs who haven't invited any partners yet.

---

### Settings page (`/settings`)
Who sees it: All logged-in users

1. **Blocker** — The **"Delete Account" confirmation button has no click handler**. Users type "DELETE", click the destructive button, and nothing happens. Trust and compliance failure.
2. **Embarrassing** — The notification settings section is titled "Change Orders" but the underlying settings are named after "Work Orders." Inconsistent language.
3. **Rough edge** — Not linked from the mobile bottom nav.

---

### Reminders page (`/reminders`)
Who sees it: GC

1. **Rough edge** — Empty state is a blank white area — no icon, no CTA.

---

### Notifications sheet (global)
Who sees it: All users

1. **Embarrassing** — `PO_APPROVED` and `PO_REJECTED` notification types show a generic circle icon because they were never added to the icon map.
2. **Rough edge** — If notifications fail to load, nothing is shown to the user — errors are silently logged to the console.

---

### Desktop sidebar (global chrome)
Who sees it: All users on desktop

1. **Blocker** *(product-level)* — Only 5 items linked. Purchase Orders and RFIs work but are not in the sidebar. Power features hidden.
2. **Rough edge** — No visible active state when the user is inside a project.

---

### Mobile bottom nav (global chrome)
Who sees it: All users on mobile

1. **Blocker** *(FC-specific)* — Bottom nav is hardcoded to GC tabs (Overview, COs, Invoices, Orders). Field Crew's #1 action — Quick Capture — has no shortcut anywhere.
2. **Missing** — Financials, POs, Estimates, Orders, Settings, Projects are all missing from the mobile nav entirely.

---

### Project tab bar (inside a project, mobile)
Who sees it: All roles

1. **Embarrassing** — Shows all 9+ project tabs to Field Crew on a phone in a horizontal scroll. Procore mobile shows 4 role-relevant tabs.

---

# TRADE CONTRACTOR (TC) — additional issues

### TC Project Overview (`/project/:id/tc-overview`)
Who sees it: TC users

1. **Blocker** — Gross margin (GC contract minus FC contract) is shown to every `TC_PM` in the organization with no per-project membership check. TC PMs see the margin on projects they were never invited to.
2. **Blocker** — Any TC user (including a field foreman) can set the downstream FC contract value. No admin check.
3. **Rough edge** — When the TC hasn't set the contract, the card shows an em-dash "—" with no CTA telling them what to do next.

---

### TC Dashboard
Who sees it: TC users

1. **Missing** — Retainage withheld is not shown anywhere. This is Procore's #1 subcontractor KPI.
2. **Missing** — The "attention" strip has no "change order" type — pending COs waiting for TC pricing don't appear as actionable items.

---

### TC Contract SOV Editor
Who sees it: TC users

1. **Blocker** — The check for "is this a TC user?" reads a role string that only matches `TC_PM`. Any TC with role `FS` (field supervisor) bypasses the guard and gets the **full GC-equivalent edit surface** on the upstream contract.
2. **Embarrassing** — Shows both the GC→TC SOV (read-only) and the TC→FC SOV (editable) in the same view with no visual distinction. TC can easily edit the wrong one.

---

### TC CO Sidebar (inside CO detail)
Who sees it: TC users

1. **Blocker** — If the GC's markup-visibility setting is not set (null) instead of "hidden", TC sees the GC's internal budget. The client tries to default it but a stale value slips through.

---

### TC Materials / PO Tab
Who sees it: TC users

1. **Blocker** — The "hide pricing" logic only fires when material responsibility is explicitly "GC". If it's null (unset), TC sees pricing they shouldn't see.

---

### TC Approve button (on invoices)
Who sees it: TC users

1. **Embarrassing** — `TC_PM` role defaults to `canApprove: false`. Users land on an FC invoice, see the Approve button greyed out, no tooltip, no explanation. Looks broken.

---

### TC FC-input-request flow
Who sees it: TC users on CO detail

1. **Embarrassing** — Iterates over the list of FC organizations but has no picker — silently sends to the first one in the list.

---

# FIELD CREW (FC) — additional issues

### FC Dashboard
Who sees it: FC users

1. **Blocker** — Missing the "earned to date", "incurred to date", and "margin to date" fields that the TC version has. FC sees a **projected** margin instead of "have I been paid for what I actually worked."
2. **Embarrassing** — FCs with multiple TC clients only see the first project silently. No portfolio view, no picker.

---

### FC Project Overview
Who sees it: FC users

1. **Blocker** — Cash position formula is literally `totalPaid - 0`, with a comment saying "FC has no payables." Wrong — any FC that pays labor subs or materials has payables.
2. **Blocker** — "Pending CO net at risk" aggregates every CO on the project, including GC-TC negotiations that FC has no part in. Data leak.
3. **Blocker** — Same role-string bug as TC: FC users with role `FS` bypass the guard and get the GC-equivalent SOV surface.
4. **Blocker** *(server-side gap)* — If an FC organization is ever set as the pricing owner (data error), FC sees pricing everywhere. There's no server-side backstop.

---

### FC Quick Capture (`/quick-capture`)
Who sees it: FC users on mobile

1. **Blocker** — Desktop fallback sends users to `/change-orders/new` which isn't FC-aware and has no role gate.
2. **Embarrassing** — Success screen shows a dead button labeled "Submit to TC" (raw enum) when no upstream contract exists.
3. **Embarrassing** — GPS location is captured silently but never shown as a map, coordinates, or confirmation. If permission is denied, nothing happens. CompanyCam always confirms with a map thumbnail.

---

### FC Daily Log
Who sees it: FC users

1. **Missing** — There is no FC-specific daily log view. If an FC fills it in, they're filling in the GC's log.

---

### FC budget edit input
Who sees it: FC users on mobile

1. **Rough edge** — No `inputMode="decimal"` on the dollar field. iOS opens a QWERTY keyboard instead of a number pad.

---

### FC role labels
Who sees it: FC users

1. **Rough edge** — The same role appears as "Trade Contractor", "TC", "Trade Contractor Manager", and raw "TC" enum all in the same session.

---

# SUPPLIER — pages and issues

### Supplier Dashboard
Who sees it: Supplier users

1. **Blocker** — The whole page is 487 lines of inline `style={{}}` bypassing the design system. No dark mode. Broken on phones under 375px wide.

---

### Supplier Estimates page (`/estimates`)
Who sees it: Supplier users

1. **Blocker** — Estimates are fetched with **no organization filter**. Every supplier sees every other supplier's estimates.
2. **Blocker** — Projects list is fetched with no filter — returns every project in the database to any supplier.
3. **Blocker** — The "Supplier" dropdown in the estimate form is populated with the **entire supplier directory**. A supplier can create an estimate attributed to a competitor.
4. **Embarrassing** — There is a second, duplicate estimate page (`SupplierProjectEstimates`) that uses different database tables and different status vocabularies.

---

### Supplier Inventory (`/inventory`)
Who sees it: Designated suppliers

1. **Blocker** — The auth guard has a race condition: legitimate designated suppliers are instantly redirected to `/dashboard` because one check runs before the other loads.
2. **Embarrassing** — Non-dismissible help alert on every page load, forever. Never goes away.

---

### Material Orders (`/orders`)
Who sees it: Supplier users

1. **Blocker** — **Entire "New Order" flow is dead**. The underlying `work_items` table was removed, but the page still ships. The dialog always says "No work items available." Feature is a zombie.

---

### Returns tab (in project)
Who sees it: Supplier users

1. **Blocker** — Returns are fetched with only a project-ID scope, no org scope. If database policies aren't tight, cross-org return notes leak.

---

### Return Detail page
Who sees it: Supplier users

1. **Blocker** — Delete return button has **no confirmation at all**. Single mobile tap wipes a submitted return.
2. **Blocker** — Return item updates run in a sequential loop with no transaction. A mid-loop failure leaves the return in a corrupt partial state.
3. **Missing** — No photo viewer, despite condition photos being critical to a real return workflow.

---

# PLATFORM ADMIN — pages and issues

### Platform Dashboard
Who sees it: Platform admins

1. **Rough edge** — Search dropdown doesn't render when there are zero results. Admin can't tell if search is broken or the record just doesn't exist.

---

### Platform Organizations list
Who sees it: Platform admins

1. **Embarrassing** — Name filter runs on the client after fetching every org. Won't scale — and different from the (correct) approach on the Users page.
2. **Missing** — No column sorting.

---

### Platform Org Detail
Who sees it: Platform admins

1. **Blocker** — "Delete Org" goes through a free-text "reason" dialog with **no typed org-name confirmation** and no summary of what will be deleted. Catastrophic and irreversible.
2. **Embarrassing** — A database join is cast as `any`. If the underlying table doesn't exist, admins silently see empty projects for every org.

---

### Platform Users list
Who sees it: Platform admins

1. **Missing** — No bulk actions (bulk role change, bulk deactivate). Table-stakes admin functionality vs. Retool.

---

### Platform User Detail
Who sees it: Platform admins

1. **Missing** — No "last login" or "last active" timestamp. This is the single most-asked support question.

---

### Platform Roles & Permissions page
Who sees it: Platform admins

1. **Blocker** — The page description itself admits **"Changes are saved as configuration intent — enforcement wiring is separate."** Toggling a permission does **nothing**. Platform admins believe they've blocked a capability that is still fully live.

---

### Platform Plans
Who sees it: Platform admins

1. **Embarrassing** — Feature-flag toggle has instant effect on every customer on that plan. No "X organizations affected" warning. LaunchDarkly-style impact preview expected.

---

### Platform KPIs page
Who sees it: Platform admins

1. **Embarrassing** — "Add KPI" creates a key like `custom_${timestamp}` with **no data binding**. Nothing appears in any dashboard. UI configuration with no plumbing behind it.

---

### Platform Logs
Who sees it: Platform admins

1. **Embarrassing** — Fetches only the last 200 rows with no pagination. Busy months silently lose history.
2. **Missing** — No filter by admin actor, no free-text search on reason/summary — even though the underlying hook already supports it.

---

### Platform QA Tools
Who sees it: Platform admins

1. **Blocker** — Hardcodes a specific production user's ID.
2. **Blocker** — "Clear QA data" fires immediately with no confirmation. One click wipes QA data.

---

### Platform Setup page
Who sees it: Platform admins

1. **Embarrassing** — Maintenance-mode toggle flips visually **before** the operator clicks Save. Gives false confidence that maintenance mode is live when it isn't.
2. **Rough edge** — Logo URL is a free text field with no validation or domain allowlist. Could be pointed at a tracking pixel.

---

### Platform Projects
Who sees it: Platform admins

1. **Embarrassing** — The "Work Orders" column always shows 0. The count was removed but the column still ships.

---

### Platform CO Scenarios
Who sees it: Platform admins

1. **Embarrassing** — "Import to platform" runs immediately with no confirm/diff step.
2. **Rough edge** — Doesn't use the standard platform layout — wraps its own container.

---

### Platform GC Dashboard
Who sees it: Platform admins viewing a GC org

1. **Blocker** — **10 row-click handlers are literally `console.log(...)`** instead of navigation. The whole table looks clickable and does nothing.

---

### Impersonation feature
Who sees it: Platform admins

1. **Blocker** — Admin's access + refresh tokens are stored in `sessionStorage`. Any cross-site scripting bug in the impersonated user's app reads them. Stripe's model is server-side session with no original token client-side.
2. **Blocker** — 2FA gate for platform actions is client-side only. A patched client can bypass it. Should also be verified inside the edge function.
3. **Rough edge** — The "you are impersonating" banner may not render inside project pages, only inside the platform layout.

---

# CROSS-CUTTING PROBLEMS (apply everywhere)

### Design system
1. **Embarrassing** — Around **380 hardcoded color classes** (`text-white`, `bg-black`, etc.) across 30+ files, bypassing semantic tokens. Dark mode is broken in many places.
2. **Embarrassing** — Around **40 raw hex color utilities** (`bg-[#…]`).
3. **Embarrassing** — GC Project Overview alone has **106 inline style objects** built around a custom color palette.
4. **Embarrassing** — Border-radius values scattered (`rounded-xl`, `rounded-2xl`, `rounded-[Npx]`). No consistent shape language.

### Loading states
1. **Embarrassing** — **38 of 57 pages have no loading skeleton.** 10 of them flash blank on first load. Worst offenders: Payment Applications, CO Guided Builder, CO New Intake, Project SOV, Project Home, RFI Detail, CO Detail.

### Empty states
1. **Embarrassing** — Only **4 files in the entire codebase** have an empty-state pattern. Every list page (Purchase Orders, Reminders, RFI List, Dashboard, Partner Directory) shows a blank white area when there's no data.

### Error messages
1. **Rough edge** — Toast usage is inconsistent. Some failures show a toast, some just `console.error`, some use browser `alert()`.

### Mobile
1. See mobile bottom nav and project tab bar issues above.
2. **Embarrassing** — Data-heavy tables (Purchase Orders, Supplier Inventory at 704 lines, Estimate Approvals at 500 lines) horizontal-scroll on mobile with no column priority.

### Accessibility
1. **Embarrassing** — Only about 45 `aria-label` usages across ~200 components. Below what an enterprise audit will require.
2. **Rough edge** — Icon-only buttons missing labels: password show/hide, inline-edit cancel, quick-capture back, platform KPI reorder arrows.
3. **Rough edge** — Custom bottom sheet and drawer components have no focus trap.

### Dead code / dead routes
1. Platform GC Dashboard 10 dead handlers (see Platform section).
2. GC Project Overview `console.log('save contract', ...)` leaks user data to browser console.
3. `ResetPassword.tsx` — entire file never rendered.
4. `ProjectSOVPage.tsx` — lazy-imported, no route.
5. Material Orders — entire "New Order" flow is dead.

### Security-adjacent UI
1. Multiple destructive actions use browser `confirm()` instead of typed confirmation dialogs (PO delete, Return delete, various admin actions).
2. Approve-money buttons fire without confirmation.
3. Delete Account button doesn't work (see Settings).

### Performance
1. Project Home fires database calls one after another instead of in parallel.
2. Some queries have `staleTime: Infinity` — data never refreshes.
3. Giant single-file pages: Edit Project Scope (909 lines), Project Details Wizard (889), Finish Project Setup (859), CO Guided Builder (730), Profile (726).

---

# HOW TO USE THIS LIST

Reply with either:
- **Section names** you want fixed first (e.g. "Signup, GC Dashboard, Settings"), or
- **Numbered items** from the sections above (e.g. "Signup #1, #2, #3; Settings #1"), or
- A **theme** (e.g. "everything marked Blocker", "all mobile issues", "all data leaks first").

I'll then propose a build plan for that batch.
