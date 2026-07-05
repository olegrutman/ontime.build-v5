# Ontime.Build — Full Product Audit

**Date:** July 5, 2026
**Scope:** Every page, every role.
**Deliverable:** Findings only. No code changes in this pass.
**Benchmarks:** Linear, Notion, Stripe, Vercel, Figma, Procore, Buildertrend, CompanyCam, QuickBooks, Retool.

**Severity legend**
- **P0** — Ship-stopper. Broken, corrupt, misleading, or leaks data. Fix before any paying customer touches this.
- **P1** — Serious defect. Users will complain or churn.
- **P2** — Below leading-app standard. Works, but not what customers expect.
- **P3** — Polish / craft.

---

## 0. Executive Summary

### Readiness score per role (0–10)

| Role | Score | One-line verdict |
|---|---|---|
| Visitor / logged-out | **5** | Legal pages exist, but signup is a two-headed monster with dead buttons and dead legal links. |
| General Contractor | **6** | Solid bones and a genuinely ahead-of-market AI CO intake. Undermined by hardcoded mock data on a live route, a dead "Delete Account" button, and dead navigation. |
| Trade Contractor | **4** | Two P0 permission leaks in SOV editor and TC overview. `Approve` button is disabled with zero explanation. |
| Field Crew | **3** | The mobile experience does not exist. Bottom nav has no Quick Capture. GPS is captured but never confirmed. `cashPosition = totalPaid - 0` is hardcoded. |
| Supplier | **4** | Three P0 cross-org data leaks: full estimate list, full supplier directory, supplier `contact_info` all exposed without filters. |
| Platform Admin | **5** | Impersonation stores admin refresh tokens in `sessionStorage`. Delete Org has no typed confirmation. Role rules are UI-only "configuration intent" that nothing enforces. |

### Overall verdict

The app is **not ready to hand to paying customers as-is**. The architecture is good; the craft finish is not. The pattern across every role is the same: strong first draft, then a long tail of broken buttons, dead links, hardcoded fallbacks, and permission checks that assume happy-path data.

### Top 5 blockers across the whole app

1. **Signup phone flow creates a real Supabase user with the literal email `phone-placeholder@ontime.build`** — the second user to try phone signup gets "already registered." The OTP verifier expects 8 digits, Supabase sends 6. Phone signup is 100% broken.
2. **Supplier data leaks** — `SupplierEstimates.tsx:138`, `SupplierEstimates.tsx:166`, and `PurchaseOrders.tsx:88` all fetch cross-org lists (estimates, suppliers, `contact_info`) with no `organization_id` filter.
3. **TC/FC permission leaks in SOV editor** — `ContractSOVEditor.tsx:35-36` derives `isTC`/`isFC` from `currentRole` string. Any `FS` (field supervisor) role bypasses the guard and gets a GC-equivalent SOV edit surface.
4. **`GCProjectOverview.tsx` renders hardcoded mock data** — hardcoded project "5 Cherry Hills Park," hardcoded contractor "Derek Kowalski," "Save Contract Changes" button is a `console.log`. Live route.
5. **`Settings.tsx:305` Delete Account confirmation button has no `onClick`** — user types "DELETE," clicks the destructive action, nothing happens, no error. Trust and compliance failure.

### Top 5 "embarrassing in a demo" issues

1. Dead `<a>Terms of Service</a>` and `<a>Privacy Policy</a>` anchors in **both** signup screens. Legal exposure.
2. Google OAuth `redirect_uri` is `window.location.origin` (no path). Google login can silently land on the Landing page with no auth redirect.
3. `PlatformGCDashboard.tsx` has **10 row-click handlers that are literally `console.log(...)`** — the whole table looks clickable and does nothing.
4. Product name inconsistency: **"Ontime.Build"** on Landing, **"OnTime.Build"** on AuthCallback and VerifyEmail. "V1" label visible in signup sidebar.
5. `MaterialOrders.tsx` "New Order" dialog always shows "No work items available" because `work_items` table was removed but the page still ships. Entire feature dead.

---

## 1. Signup & Onboarding — Deep Dive

### The core problem: two separate signup flows

`App.tsx:195-196` routes both `/auth` (register tab) and `/signup` to different components with different logic:

| | `/auth` → `SignUpScreen.tsx` | `/signup` → `Signup.tsx` |
|---|---|---|
| Steps | 3 in a single card | Multi-step wizard with sidebar |
| Password minimum | 8 chars | **6 chars** |
| Company address | Not collected | Required |
| DB RPC on complete | `create_organization_and_set_admin` | `complete_signup` |
| Email verification | OTP entry (expects **8 digits** — Supabase sends 6) | Magic link |
| Terms/Privacy links | Dead `<a>` with no `href` | Dead `<span>` with cursor-pointer |
| Success screen | Rendered then immediately overwritten by `navigate('/dashboard')` — never visible | Reached |

Users get different products depending on which URL they arrive at. A password created in one flow will fail validation in the other.

### Vs. leading apps

| Criterion | Linear | Notion | Stripe | Ontime.Build |
|---|---|---|---|---|
| Steps to active | 2 | 2–3 | 3 | 3–5 |
| Phone signup | Not offered | Not offered | Not offered | **Offered but broken** |
| ToS/Privacy links | Real | Real | Real | **Dead in both flows** |
| After signup | Empty dashboard with setup prompt | Template picker | Test-mode checklist | Cold drop to dashboard, no first-run |
| Google OAuth | First-class | First-class | First-class | Present, redirect_uri likely misconfigured |
| Time-to-value claim | None | "Use Notion for free" | None | **"60 seconds"** (actual: minutes + email verify) |

### Concrete signup gap list (from the deep dive)

**P0**
- `SignUpScreen.tsx:132` — phone signup passes `'phone-placeholder@ontime.build'` as email. Creates fake account.
- `SignUpScreen.tsx:163` — OTP length check `< 8` rejects every valid 6-digit Supabase code.
- `SignInScreen.tsx:157` — visible label "UI preview only" ships to production.
- `AuthPage.tsx:109` — Google OAuth `redirect_uri: window.location.origin` should be `.../auth/callback`.

**P1**
- `SignUpScreen.tsx:380` and `AccountStep.tsx:223-226` — Terms / Privacy are dead anchors and dead spans.
- `SignUpScreen.tsx:168-173` — phone OTP path tells user "not available yet" *after* creating a fake account.
- `AuthPage.tsx:218` — `useState`/`useEffect` re-imported with aliases inside the same file; `ResetPasswordInline` lives alongside `ResetPassword.tsx` (dead code).
- `Signup.tsx:407-409` — Back from CompanyStep resets path but Supabase account already exists → orphan.
- `PendingApprovalStep.tsx` — no polling / no subscription. User waits forever with no feedback.
- `ForgotScreen.tsx:25-31` — no email validation. Empty submit returns "email sent" (false confirmation).
- `AuthPage.tsx:130` — existing-email message shown with no actionable sign-in CTA.

**P2**
- Password policy split: 6 chars in `AccountStep`, 8 everywhere else.
- `AuthCallback.tsx:74` — 1.5s auto-redirect with no manual "Continue →" fallback link.
- `VerifyEmail.tsx:95` — "Go back" always links to `/signup` even for `/auth`-flow users.
- `JoinSearchStep.tsx:37` — no min query length; empty search dumps all orgs to unauthenticated visitors.
- Two parallel signup flows shipping side by side.
- No `<form>` element in `SignInScreen` — Enter key only works on password field.
- `Privacy/ToS/Security` "updated: May 21, 2026" is a future date.

**P3**
- Product-name inconsistency (`Ontime.Build` vs `OnTime.Build`).
- "V1" label visible in signup sidebar.
- "200+ construction teams" claim in BrandPanel appears to be placeholder.
- "60 seconds" tagline is not honest.

### The right shape for signup

Model it on Linear:
- Single flow. One code path. `/signup` and `/auth` route to the same component with a mode toggle.
- One field on page 1: email. Send magic link. Progressive disclosure for name/company/role after verification.
- Google OAuth as first-class equal to email, `redirect_uri` = `${window.location.origin}/auth/callback`.
- Kill the phone path entirely until it works.
- Real ToS + Privacy hrefs.
- Post-signup: an empty dashboard with a clear "Create your first project" CTA and a 3-step onboarding checklist that actually reflects the user's state (org set up? teammate invited? project created?).

---

## 2. Visitor / Logged-Out Pages

| Page | Grade | Findings |
|---|---|---|
| `/` Landing | B | P2: single `<Suspense>` around all lazy sections — one chunk failure blanks the fold. P3: canonical URL hardcoded to `pm.ontime.build`. |
| `/demo` | Not audited (public demo) | — |
| `/auth` `/signup` `/verify-email` `/reset-password` `/auth/callback` | D (see §1) | Full findings in Signup Deep Dive. |
| `/install` | B− | P2: "Skip for now" navigates to `/dashboard`, bouncing unauthenticated users to `/auth`. P3: no branding. |
| `/privacy` `/terms` `/security` | A− | Substantive copy. P2: future "updated" date. P2: hardcoded canonical URL. P3: Delaware governing law claim. |
| `/unsubscribe` | A− | Works. P3: no "re-subscribe" link. |
| `/external/co-approve/:token` | C+ | P1: `alert('Failed to submit response. Please try again.')` used on failure. P2: approver name accepts single character as "signature". P3: no Ontime branding — no trust signal for external approvers. |
| `/external/co/:token` | C | P2: email field has no format validation. Same branding gap. |

---

## 3. General Contractor

### 3.1 Dashboard (`Dashboard.tsx` + `GCDashboardView.tsx`)

- **P0** — `Dashboard.tsx:194,228,262,296,357`: `onSetPartOfTeam` calls `setSoleMember(true)` in every branch. This is the opposite value. Users who click "I'm part of a team" are marked as sole operators.
- **P1** — Archive / Complete / AddReminder dialogs are mounted in the GC branch but their state setters are only called from the fallback render path. GCs in the GC-specific view cannot archive or add reminders from the dashboard.
- **P2** — `GCDashboardView.tsx:169,187` hardcodes `orgType="GC"` strings.
- **P2** — Two KPI cards share `idx={1}` → simultaneous animation.

### 3.2 Create / Setup / Edit

- **P1** — Create project is 7 steps. Procore uses 3. `canProceed` requires GC contract *and* FC contract on Day 1 for TC creators — a real onboarding blocker.
- **P2** — `FinishProjectSetup.tsx` is a second 7-step wizard that duplicates and diverges from `CreateProjectNew.tsx`. No Cancel confirmation dialog (create-project has one).
- **P2** — `EditProjectScope.tsx` is 909 lines in a single file.

### 3.3 Project Home / Overview

- **P0** — `GCProjectOverview.tsx:24-238` is entirely hardcoded mock data on a live authenticated route (`/project/:id/gc-overview`). "Save Contract Changes" is `console.log('save contract', contract)`.
- **P0** — `GCProjectOverview.tsx:420` "✓ Approve — $18,400" button fires the mutation directly with no confirmation dialog.
- **P0** — `App.tsx:71` lazy-imports `ProjectSOVPage` but there's no `<Route>` for it. The richer SOV page (CSV export, lock/unlock, history) is completely unreachable.
- **P1** — `CODetail.tsx:30` doesn't pass `onStatusChange` to `ProjectShell` → the status dropdown in the CO detail header is a silent no-op.
- **P1** — `ProjectShell.tsx:98-108` has no breadcrumb / back-to-dashboard affordance on desktop.
- **P1** — `RFIDetailPage.tsx:57-63` shows an infinite spinner with no escape when an RFI ID doesn't exist. No 404, no back button.
- **P1** — `RFIs.tsx` shows a blank page for new GCs with no projects (auto-selects `projects[0]`; if empty, renders nothing).
- **P2** — `ProjectHome.tsx:325` sidebar offset hardcoded as `lg:ml-[200px] xl:ml-[220px]`.

### 3.4 Financials, Purchase Orders, RFIs, Change Orders

- **P0** — `PurchaseOrders.tsx:98-100, 313-324` — dead "Work Item" dropdown; the table was removed but the field ships empty. Validation lets orphan POs through.
- **P0** — `PurchaseOrders.tsx:226` uses native browser `confirm()` for irreversible PO delete.
- **P2** — `PaymentApplicationsPage.tsx` builds PDFs from COs only. Real AIA G702/G703 requires SOV line items, % complete, retainage, net calculation. Owners will reject these documents.
- **P2** — `Settings.tsx:181` — notification section heading says "Change Orders" but keys reference `notify_wo_*` (Work Orders).

### 3.5 Team, Partners, Suppliers

- **P2** — `OrgTeam.tsx` only manages internal org members; no way to invite a TC or Supplier *company* to a project from here. Procore/Buildertrend both make Directory a first-class module.
- **P3** — `PartnerDirectory` has no empty-state CTA for new GCs.

### 3.6 Global chrome

- **P1** — `DashboardSidebar.tsx:29-50`: only 5 items. `/rfis` and `/purchase-orders` exist and work but are not linked from the sidebar or `MobileBottomNav`. Power-user workflow → hidden behind ⌘K.
- **P1** — `MobileBottomNav.tsx:33-35` — "My Team" for GC admins is hidden behind the "More" drawer.
- **P1** — Missing from mobile nav entirely: `/financials`, `/purchase-orders`, `/estimates`, `/orders`, `/settings`, `/projects`.
- **P3** — `DashboardSidebar` shows no active state when inside `/project/*`. Sidebar is decorative during the user's primary workflow.
- **P3** — `CommandPalette.tsx:27` — Profile item uses the `Settings` icon.

### 3.7 Settings / Profile

- **P0** — `Settings.tsx:305-310` — the destructive `AlertDialogAction` "Delete Account" has **no `onClick`**. Users type "DELETE," click, nothing happens.

---

## 4. Trade Contractor (delta from GC)

### 4.1 Permission gates that fail

- **P0** — `ContractSOVEditor.tsx:35-36`: `isTC = currentRole === 'TC_PM'`. Any TC user with role `'FS'` (field supervisor) bypasses the guard and gets the **GC-equivalent SOV surface** with full edit rights on the upstream contract's line items.
- **P0** — `TCProjectOverview.tsx:283-284`: gross margin (GC contract − FC contract) is rendered without any per-project member visibility gate. Every `TC_PM` in the org sees every project's margin.
- **P0** — `TCProjectOverview.tsx:167-249`: `saveFcContract()` upsert has no `is_org_admin` or member-permission guard. Any TC user (including a field foreman) can set the downstream FC contract value.
- **P0** — `organization.ts:175-188`: `TC_PM` defaults `canApprove: false`. TC lands on an FC invoice, sees the Approve button disabled, gets no tooltip and no explanation. Dead button by default.

### 4.2 Data leaks from GC/upstream

- **P1** — `COSidebar.tsx:327` shows TC the `gc_budget` (GC-facing price) when `tc_markup_visibility === 'detailed'`. Default coercion is client-side only in `useMarkupVisibility.ts:17`; a stale/null value could leak the GC's internal budget.
- **P1** — `TCDashboardView.tsx:83-86` "Materials Pulse" queries all POs the TC org has any role on, including GC-priced POs where `material_responsibility = 'GC'`.
- **P1** — `PurchaseOrdersTab.tsx:75`: `hidePricing` only fires when `material_responsibility === 'GC'`. If it's null (unset), TC sees pricing it shouldn't.

### 4.3 Missing / friction

- **P1** — TC dashboard doesn't surface retainage withheld anywhere. Procore's subcontractor portal makes this KPI #1.
- **P1** — Attention strip has no `change_order` type — pending COs waiting for TC pricing don't appear as actionable items.
- **P1** — TC's FC-input-request flow at `CODetailLayout.tsx:205-222` iterates over `fcOrgOptions` but has no UI to pick which FC → sends to `[0]` implicitly.
- **P2** — SOV editor shows both GC→TC (read-only) and TC→FC (editable) SOVs in the same view with no visual distinction. TC can easily edit the wrong one.
- **P2** — `LaborEntryForm.tsx:73-74` — markup defaults to `'null'` string when org markup isn't set.

---

## 5. Field Crew (delta from TC)

### 5.1 Permission / correctness

- **P0** — `ContractSOVEditor.tsx:35` — `isFC = currentRole === 'FC_PM'`. An FC user with role `'FS'` bypasses the guard and gets the GC-equivalent create-SOV path.
- **P1** — `usePOPricingVisibility.ts` enforces "FC can never see pricing" client-side only. If an FC org is ever set as `pricing_owner_org_id` (data error), FC sees everything. No RLS backstop visible.
- **P1** — `FCProjectOverview.tsx` uses `financials.pendingCONetAtRisk` which aggregates *all* project COs, including GC/TC upstream negotiations FC has no part in. Data leak.
- **P1** — `FCProjectOverview.tsx ~178`: `cashPosition = totalPaid - 0` with the comment `// FC has no payables in this hook`. Wrong. Any FC that pays labor subs or materials has payables.

### 5.2 Mobile experience — this is where FC lives

- **P0** — `ProjectBottomNav.tsx:33-38` is hardcoded (Overview, COs, Invoices, Orders). Zero role customization. **Quick Capture — FC's #1 field action — has no bottom-nav shortcut anywhere.**
- **P0** — `ProjectTabBar.tsx:76-98` shows all 9+ project tabs to FC on mobile in a horizontal scroll. Procore mobile shows 4 role-relevant tabs.
- **P1** — `FCProjectOverview.tsx` budget edit `<input>` has no `inputMode="decimal"` or `type="number"`. iOS opens a QWERTY keyboard for a dollar field.
- **P1** — `QuickCapture.tsx:26-28` desktop fallback sends users to `/change-orders/new` which is not FC-aware and has no role gate at `App.tsx:213`.
- **P1** — `QuickCaptureFlow.tsx ~140`: success screen "Submit to {upstreamOrg.name}" shows a dead button labeled "Submit to TC" (raw enum) when no upstream contract exists.

### 5.3 Missing surface

- **P0** — `FCDashboardView.tsx:22-28` — `FinancialSummary` never got the `earnedToDate` / `incurredToDate` / `marginToDate` fields the TC version has. FC sees a *projected* margin, not "have I been paid for what I worked."
- **P1** — `FCDashboardView.tsx ~103` — silently shows only `projects[0]`. FCs with multiple TC clients see only one.
- **P1** — `FCProjectOverview.tsx:33-36` — when TC hasn't set the contract, card shows `—` with no CTA to nudge TC.
- **P1** — Daily Log has no FC-specific view. If FC fills it in, they're filling in the GC's log.
- **P2** — `FieldCaptureSheet.tsx:31-38` captures GPS but never shows a map / coordinates. Silent failure if permission denied. CompanyCam always confirms with a map thumbnail.

### 5.4 Copy

- **P2** — Role labels: `Trade Contractor`, `TC`, `Trade Contractor Manager`, and `TC` raw enum all appear in the same session for the same role.

---

## 6. Supplier

### 6.1 Cross-org data leaks

- **P0** — `SupplierEstimates.tsx:138`: bare `.select()` on `project_estimates` with no `supplier_id` / `organization_id` filter. Every supplier sees every other supplier's estimates. `fetchProjects()` at line 153 has the same shape — returns every project in the DB.
- **P0** — `SupplierEstimates.tsx:166-177`: `fetchSuppliers()` populates the "Supplier" dropdown with the entire supplier directory. A supplier can create an estimate attributed to any competitor.
- **P0** — `PurchaseOrders.tsx:87-95`: `suppliers` fetched with `contact_info` and no `organization_id` filter → email addresses of all suppliers exposed to any buyer.
- **P1** — `ReturnsTab.tsx:40-56`: returns fetched with only `project_id` scope, no org scope. If RLS isn't tight, cross-org return notes leak.

### 6.2 Destructive actions

- **P0** — `PurchaseOrders.tsx:225-229` — native `confirm()` for PO delete. Same pattern at `AdminSuppliers.tsx:198`.
- **P1** — `ReturnDetail.tsx:76-88` — delete return has no confirmation at all. Single mobile tap wipes a submitted return.
- **P1** — `ReturnSupplierReview.tsx:73-112` — sequential per-item updates in a loop with no transaction. Mid-loop failure leaves the return in a corrupt partial state.

### 6.3 Auth / broken flows

- **P0** — `SupplierInventory.tsx:103-120` — auth guard has a race with `isDesignatedOnly` (which is set in a separate async `useEffect`, not in the deps array). Legitimate designated suppliers are instantly redirected to `/dashboard`.
- **P1** — `MaterialOrders.tsx:62-65, 97-100` — zombie page. `work_items` table removed; `fetchWorkItems()` returns `[]`; the "New Order" dialog always shows "No work items available." Entire flow dead.
- **P1** — Duplicate estimate pages (`SupplierEstimates.tsx` + `SupplierProjectEstimates.tsx`) with different DB tables and different status vocabularies.
- **P1** — `SupplierDashboardView.tsx` is 487 lines of inline `style={{...}}` bypassing the design system entirely. Zero dark-mode support; broken on <375px.

### 6.4 Polish

- **P2** — `SupplierInventory.tsx:477-482` — non-dismissible help alert on every page load, forever.
- **P2** — `ReturnDetail.tsx` — no attachment / photo viewer, despite condition photos being critical to a real return workflow.
- **P2** — `AdminSuppliers.tsx:46` — role check by string literal, not the `AppRole` enum.
- **P3** — `PurchaseOrders.tsx:95-109` — `APPROVED` and `FULFILLED` map to the same "default" badge variant; visually indistinguishable.

---

## 7. Platform Admin

### 7.1 Security & trust

- **P0** — `PlatformRoles.tsx:58` — the CardDescription itself admits: *"Changes are saved as configuration intent — enforcement wiring is separate."* Toggling permission rules does nothing. Platform admins believe they've blocked a capability that is still fully live.
- **P0** — `useImpersonation.ts:67-77` — admin access + refresh tokens stored in `sessionStorage`. Any XSS in the impersonated user's app reads them. Stripe's model: server-side session, no client-side original token.
- **P0** — `PlatformOrgDetail.tsx:272-282` — org delete goes through a free-text "reason" dialog with no typed org-name confirmation and no "what will be deleted" summary. Catastrophic and irreversible.
- **P0** — `PlatformQA.tsx:11` hardcodes a production user UUID. `handleClear` fires `seed-qa-environment` with `action: 'clear'` with no confirm — one click wipes QA data.
- **P1** — `RequirePlatformRole.tsx:46-62` — 2FA gate is client-only. Must be verified inside the `platform-support-action` edge function; otherwise a patched client bypasses it.

### 7.2 Half-built admin tools

- **P1** — `PlatformProjects.tsx:72-80` — the WOs column always shows 0 (`Promise.resolve({ data: [] })` — WO count removed but column still ships).
- **P1** — `PlatformSetup.tsx:106-124` — maintenance-mode `Switch` flips visually before "Save" is clicked. Operator gets false confidence that maintenance mode is live.
- **P1** — `PlatformKPIs.tsx` — "Add KPI" creates `custom_${Date.now()}` keys with no data binding. UI configuration with no data plumbing.
- **P1** — `PlatformOrgDetail.tsx:106-110` — `project_team` cast `as any`; if the table doesn't exist, admins silently see empty projects for every org.
- **P1** — `PlatformUsers.tsx` — no bulk actions. Table-stakes admin functionality vs. Retool.
- **P1** — `PlatformLogs.tsx` uses `useSupportLogs.limit(200)` with no pagination. Busy months lose history without indication.
- **P1** — `PlatformDashboard.tsx:65` — search dropdown doesn't render on zero results. User can't tell if search is broken or record doesn't exist.
- **P1** — `ImpersonationBanner.tsx` — verify it renders inside `AppLayout` too. If only in `PlatformLayout`, admins impersonating and browsing `/project/*` see no banner.

### 7.3 Below standard

- **P2** — `PlatformLogs.tsx` — no filter by admin actor, no free-text search on reason/summary. `useSupportLogs` already supports `platformUserId` but nothing wires it.
- **P2** — `PlatformOrgs.tsx:58` — client-side name filter over an unpaginated fetch. `PlatformUsers` does this right; `PlatformOrgs` doesn't.
- **P2** — `PlatformCOScenarios.tsx:266` — "Import to platform" runs immediately, no confirm/diff step.
- **P2** — `PlatformPlans.tsx:139-143` — feature-flag toggle has instant effect on all customers on that plan. No "X orgs affected" warning. LaunchDarkly-style impact preview expected.
- **P2** — `PlatformUserDetail.tsx` — no last-login / last-active timestamp. The single most-asked support question is "when did they last sign in?"

### 7.4 Polish

- **P3** — `PlatformQA.tsx:149` — no `title`/`breadcrumbs` on `PlatformLayout`.
- **P3** — `PlatformCOScenarios.tsx:174` — wraps its own container instead of using `PlatformLayout`.
- **P3** — `PlatformSetup.tsx:219-228` — logo URL is a free text input, no validation, no domain allowlist. Can be a tracking pixel.
- **P3** — `PlatformOrgs.tsx` — no column sorting.

---

## 8. Cross-Cutting Issues

### 8.1 Design consistency

| Pattern | Count | Verdict |
|---|---|---|
| Hardcoded color classes (`text-white`, `bg-black`, etc.) | ~380 across 30+ files | Bypasses semantic tokens; breaks dark mode. |
| Raw hex color utilities (`bg-[#…]`) | ~40 | Same. |
| Inline `style={{}}` calls in `GCProjectOverview.tsx` alone | **106** | A parallel design system built around a `C` constants object. Will never follow tokens or theme. |

- **P1** — `GCProjectOverview.tsx` — delete the `C` constants; rewrite with `bg-primary`, `text-destructive`, `border-border`.
- **P1** — `DemoV2ProjectOverview.tsx` — 31 hardcoded color classes + 8 hex literals.
- **P1** — `SupplierDashboardView.tsx` — 487 lines of inline styles.
- **P2** — `rounded-xl` / `rounded-2xl` / `rounded-[Npx]` escapees across the app. Either add them to the token set or ban them.
- Enforce via ESLint `no-restricted-syntax` targeting `style={{` and `className=".*(text|bg|border)-\[#"`.

### 8.2 Loading / empty / error state matrix

- **38 of 57 pages have no `Skeleton`.** 10 of those use `useQuery` and flash blank on first load.
  - Worst: `PaymentApplicationsPage`, `COGuidedBuilder`, `CONewIntake`, `ProjectSOVPage`, `ProjectHome`, `RFIDetailPage`, `CODetail`.
- **Only 4 files in the entire codebase emit an empty-state pattern.** Every list page (PurchaseOrders, Reminders, RFIList, Dashboard, PartnerDirectory) shows a blank white area when data is empty.
  - Fix: build one shared `<EmptyState icon title description cta />` and wire it everywhere.
- **Error toasts inconsistent.** `useNotifications.ts:41,57,76` `console.error`s without toasting — users never know notifications failed to load.

### 8.3 Mobile responsiveness

- `MobileBottomNav.tsx` covers only Dashboard / Partners / Reminders / RFIs. Missing: Financials, POs, Estimates, Orders, Settings, Projects.
- `hidden md:block` / `block md:hidden` used in only ~10 files — most data-heavy tables (`PurchaseOrders`, `SupplierInventory` at 704 lines, `EstimateApprovals` at 500 lines) are horizontal-scroll on mobile with no column priority.
- `ProjectBottomNav` and `ProjectTabBar` have zero role customization (see §5.2).

### 8.4 Notification system

- **P1** — `useNotifications.ts` types everything as `string` and casts `supabase.rpc as any` (3 spots). Comment says "until types are regenerated" — permanent debt.
- **P1** — `NotificationItem.tsx:48` — `PO_APPROVED` and `PO_REJECTED` missing from `typeIcons` and `typeColors`. Fallback to generic Circle.
- Verify realtime subscription is actually wired; the fetched hook only polls on mount.

### 8.5 Dead code / dead routes / dead buttons

- **P0** — `PlatformGCDashboard.tsx` — 10 row-click handlers are literally `() => console.log(...)` instead of `navigate()`. Whole table is dead.
- **P1** — `GCProjectOverview.tsx:236` — `console.log('save contract', contract)` leaks user data.
- **P1** — `ResetPassword.tsx` — entire file is never rendered.
- **P1** — `ProjectSOVPage.tsx` — lazy-imported, no route.
- **P1** — `MaterialOrders.tsx` — the whole "New Order" flow is dead (removed dependency).
- Only 1 explicit `TODO` found — clean — but the `console.log`-as-stub pattern is worse than a TODO.

### 8.6 Accessibility

- **~45 total `aria-label` usages across ~200 components.** Well below what an enterprise B2B audit will require.
- **P1** — Icon-only buttons with no label: password show/hide (`AuthPage.tsx:299`), inline-edit cancel (`GCProjectOverview.tsx:201`), quick-capture back (`QuickCaptureFlow.tsx:294`), platform KPI reorder arrows (`PlatformKPIs.tsx:122,124`).
- **P2** — Custom `BottomSheet.tsx` / `Drawer` components have no `onOpenAutoFocus` / focus trap.

### 8.7 Security-adjacent UI

- **P0** — `GCProjectOverview.tsx:420` — approve-$18,400 button fires directly with no confirm.
- **P0** — Native browser `confirm()` for irreversible PO delete.
- **P1** — `Profile.tsx:150` — delete-account button has no visible `AlertDialog` guard.
- **P2** — `Unsubscribe.tsx:102` — permanently disabled button with no explanation.

### 8.8 Performance

- **Good:** `App.tsx` lazy-loads all pages; global `staleTime: 5min`.
- **P1** — `ProjectHome.tsx` fires sequential `supabase.from(...)` calls in `useEffect` instead of `Promise.all` / `useQuery`.
- **P2** — `staleTime: Infinity` on CO/picker queries → data never re-validates.
- **P2** — Giant unsplit pages: `EditProjectScope` 909 lines, `ProjectDetailsWizard` 889, `FinishProjectSetup` 859, `COGuidedBuilder` 730, `Profile` 726.

---

## 9. Prioritized Backlog

Grouped by severity, then by "smallest fix that removes the largest embarrassment." Effort: S (< 1 hr), M (1–4 hr), L (1+ day).

### P0 — Blockers

| # | Page / Area | Finding | Fix | Effort |
|---|---|---|---|---|
| 1 | Signup | `SignUpScreen.tsx:132` phone signup writes fake email `phone-placeholder@ontime.build` | Remove the phone tab entirely until it works | S |
| 2 | Signup | `SignUpScreen.tsx:163` OTP length hardcoded to 8; Supabase sends 6 | Change to 6 or replace with magic-link | S |
| 3 | Signin | `SignInScreen.tsx:157` "UI preview only" ships to production | Remove label, hide phone tab | S |
| 4 | Signup | `AuthPage.tsx:109` Google `redirect_uri = origin` | Use `${window.location.origin}/auth/callback` | S |
| 5 | Signup | `SignUpScreen.tsx:380`, `AccountStep.tsx:223-226` dead ToS/Privacy links | Real `href="/terms"` and `href="/privacy"` | S |
| 6 | Settings | `Settings.tsx:305` Delete Account has no `onClick` | Wire to account-delete API | S |
| 7 | Dashboard | `Dashboard.tsx:194,228,262,296,357` `onSetPartOfTeam` sets `true` (should be `false`) | Flip the boolean in all 5 branches | S |
| 8 | GC Overview | `GCProjectOverview.tsx` hardcoded mock data on live route | Wire to real data or remove route | L |
| 9 | GC Overview | `GCProjectOverview.tsx:420` approve-$ button no confirm | Wrap in `AlertDialog` | S |
| 10 | POs | `PurchaseOrders.tsx:226` native `confirm()` for delete | Replace with `AlertDialog` | S |
| 11 | POs | `PurchaseOrders.tsx:98,313` dead Work Item dropdown | Remove field + fix validation | S |
| 12 | SOV | `ContractSOVEditor.tsx:35-36` FS-role bypasses TC/FC guards | Derive from `useOrgType()` not `currentRole` string | S |
| 13 | TC Overview | `TCProjectOverview.tsx:283-284` gross margin visible without gate | Add per-project member permission check | M |
| 14 | TC Overview | `TCProjectOverview.tsx:167-249` `saveFcContract` open to all TC_PM | Add `is_org_admin` guard client + trigger | M |
| 15 | Invoices | `organization.ts:175-188` `TC_PM.canApprove = false` default → dead Approve button with no tooltip | Grant by default OR show clear "Ask your admin to enable approvals" tooltip | S |
| 16 | FC Dashboard | `FCDashboardView.tsx:22-28` missing `earnedToDate` / `incurredToDate` / `marginToDate` | Add fields + wire; realized margin not projected | M |
| 17 | FC Mobile | `ProjectBottomNav.tsx:33-38` — no Quick Capture shortcut; hardcoded GC layout | Per-role bottom nav; add Capture as primary for FC | M |
| 18 | FC Mobile | `ProjectTabBar.tsx:76-98` — 9+ tabs on mobile | Role-aware filter, 4 tabs max | S |
| 19 | Supplier | `SupplierEstimates.tsx:138,166` — no org filter on estimates and suppliers | Add `.eq('organization_id', currentOrgId)` filters + RLS backstop | M |
| 20 | Supplier | `PurchaseOrders.tsx:87-95` — supplier `contact_info` leak | Same fix | S |
| 21 | Supplier | `SupplierInventory.tsx:103-120` — auth guard race for designated suppliers | Include `isDesignatedOnly` in deps + gate on both being resolved | S |
| 22 | Platform | `PlatformRoles.tsx` — permission rules do nothing | Either wire enforcement or hide the page until it's real | L |
| 23 | Platform | `useImpersonation.ts:67-77` — refresh token in sessionStorage | Server-side session; don't store original token client-side | L |
| 24 | Platform | `PlatformOrgDetail.tsx:272-282` — delete org has no typed confirmation | Require typed org name + summary of what deletes | S |
| 25 | Platform | `PlatformQA.tsx:11` — hardcoded prod user; `handleClear` no confirm | Read from env or picker; add typed confirmation | S |
| 26 | Platform | `PlatformGCDashboard.tsx` — 10 `console.log` row handlers | Replace with `navigate()` | S |

### P1 — Broken

| # | Area | Finding | Effort |
|---|---|---|---|
| 27 | Signup | Two parallel signup flows (`/auth` vs `/signup`) — password policies + DB RPCs diverge | Consolidate to one component | L |
| 28 | Signup | `Signup.tsx:407-409` back from CompanyStep leaves orphan Supabase account | Disable back after account creation | S |
| 29 | Signup | `PendingApprovalStep` — no polling | Realtime subscription on `org_join_requests` | M |
| 30 | Signup | `ForgotScreen.tsx:25-31` — no email validation, silent success | Validate before call | S |
| 31 | Signup | `AuthPage.tsx:218` re-imports React hooks with aliases; `ResetPasswordInline` should be its own file; `ResetPassword.tsx` dead | Extract file + delete dead one | S |
| 32 | External | `COExternalView.tsx:133` uses `alert()` on failure | Use toast + inline error | S |
| 33 | GC Nav | `DashboardSidebar.tsx` — no RFIs / POs in sidebar | Add nav items | S |
| 34 | GC Nav | `MobileBottomNav.tsx` — missing Financials/POs/Settings | Rework nav; My Team primary for admins | S |
| 35 | GC Nav | `ProjectShell.tsx` — no back-to-dashboard breadcrumb | Add breadcrumb | S |
| 36 | GC | `RFIDetailPage.tsx:57` — infinite spinner on missing RFI | Empty state + back link | S |
| 37 | GC | `RFIs.tsx` — blank page for GC with no projects | Empty state with CTA | S |
| 38 | GC | `Dashboard.tsx:232` — archive/complete/reminder dialogs mounted but unwired in GC view | Wire handlers | S |
| 39 | CO | `CODetail.tsx:30` — no `onStatusChange` passed to shell | Pass prop | S |
| 40 | TC | `COSidebar.tsx:327` `gc_budget` leaks if markupVisibility null | Server-default `'hidden'` | S |
| 41 | TC | `PurchaseOrdersTab.tsx:75` — pricing shown when `material_responsibility` null | Default to hidden when null | S |
| 42 | TC | Missing retainage KPI on dashboard | Add card | M |
| 43 | TC | Missing `change_order` attention type | Extend enum + card | S |
| 44 | FC | `FCProjectOverview.tsx` `pendingCONetAtRisk` includes GC/TC pending | Filter by FC-owned COs | M |
| 45 | FC | `FCProjectOverview.tsx` `cashPosition = totalPaid - 0` | Compute real payables | M |
| 46 | FC | Contract-not-set state has no CTA | Add "Ask your TC" prompt | S |
| 47 | FC | Multi-project dashboard silently shows `projects[0]` | Portfolio view or picker | M |
| 48 | FC | `QuickCaptureFlow.tsx` dead "Submit to TC" button when no upstream | Disable + explain | S |
| 49 | FC | Budget `<input>` has no `inputMode="decimal"` | Add attribute | S |
| 50 | Supplier | `MaterialOrders.tsx` — entire New Order flow dead | Remove or rebuild | M |
| 51 | Supplier | Duplicate estimate pages (SupplierEstimates + SupplierProjectEstimates) | Consolidate | L |
| 52 | Supplier | `ReturnDetail.tsx` — delete no confirm | Add `AlertDialog` | S |
| 53 | Supplier | `ReturnSupplierReview.tsx:73` — sequential updates no transaction | RPC | M |
| 54 | Supplier | `SupplierDashboardView.tsx` — inline styles bypass design system | Rewrite with tokens | L |
| 55 | Platform | `PlatformProjects.tsx` — WO column always 0 | Remove column | S |
| 56 | Platform | `PlatformSetup.tsx` maintenance toggle no confirmation | Confirm dialog | S |
| 57 | Platform | `PlatformKPIs.tsx` — Add KPI creates unbindable keys | Enum-restrict or wire data | M |
| 58 | Platform | `PlatformLogs.tsx` `.limit(200)` no pagination | Cursor pagination | M |
| 59 | Platform | `PlatformDashboard.tsx:65` search has no zero-state | Add "No results" | S |
| 60 | Platform | `RequirePlatformRole` 2FA client-only | Verify in edge function | M |
| 61 | Platform | No bulk actions in Users | Add select + bulk role change | L |
| 62 | Cross | `PlatformGCDashboard` 10 dead row handlers (see P0-26; keep in P1 if not counted P0) | See P0-26 | — |
| 63 | Cross | `NotificationItem.tsx:48` missing `PO_APPROVED` / `PO_REJECTED` types | Extend maps | S |
| 64 | Cross | `useNotifications.ts` `as any` × 3 | Regenerate types | S |
| 65 | Cross | 10 `useQuery` pages with no skeleton | Add skeletons | M |
| 66 | Cross | `ProjectHome.tsx` sequential supabase calls in useEffect | `useQuery` × N | M |
| 67 | Cross | `GCProjectOverview.tsx` `C` constants — 106 inline styles | Replace with tokens | L |
| 68 | Cross | `DemoV2ProjectOverview.tsx` — 31 hardcoded colors | Replace with tokens | M |
| 69 | Cross | Icon-only buttons missing `aria-label` (~5 spots called out) | Add labels | S |

### P2 — Below standard

| # | Area | Finding |
|---|---|---|
| 70 | Signup | Password minimum inconsistent (6 vs 8) |
| 71 | Signup | `AuthCallback` 1.5s auto-redirect no manual link |
| 72 | Signup | `VerifyEmail` back always to `/signup` |
| 73 | Signup | `JoinSearchStep` — no min query length; public endpoint |
| 74 | Signup | No `<form>` in `SignInScreen` — Enter key broken |
| 75 | Landing | Single `<Suspense>` around all lazy sections |
| 76 | GC | Create project 7 steps (Procore 3) |
| 77 | GC | `PaymentApplicationsPage` — non-AIA output owners will reject |
| 78 | GC | `Settings.tsx:181` "Change Orders" heading references WO keys |
| 79 | GC | `OrgTeam` can't invite partner *companies* |
| 80 | TC | SOV editor doesn't visually distinguish GC→TC read-only from TC→FC editable |
| 81 | TC | Missing retainage KPI (see also P1) |
| 82 | TC | `LaborEntryForm` markup defaults to `'null'` |
| 83 | FC | `FieldCaptureSheet` — GPS captured but never confirmed to user |
| 84 | FC | Daily Log has no FC-specific view |
| 85 | FC | Role labels inconsistent (`TC`, `Trade Contractor`, `Trade Contractor Manager`, raw enum) |
| 86 | Supplier | `SupplierInventory` — permanent non-dismissible help alert |
| 87 | Supplier | `ReturnDetail` — no photo viewer |
| 88 | Supplier | Duplicate-estimate silent redirect |
| 89 | Supplier | `useSupplierMaterialsOverview` — N+1 client aggregation |
| 90 | Supplier | Role check by string not enum (`AdminSuppliers.tsx:46`) |
| 91 | Platform | `PlatformLogs` — no actor filter, no text search |
| 92 | Platform | `PlatformOrgs` — client-side filter over unpaginated fetch |
| 93 | Platform | `PlatformCOScenarios` — "Import to platform" no confirmation |
| 94 | Platform | `PlatformPlans` — flag toggle no impact preview |
| 95 | Platform | `PlatformUserDetail` — no last-login timestamp |
| 96 | Cross | `staleTime: Infinity` on CO picker queries |
| 97 | Cross | Giant unsplit pages (5 files > 700 lines) |
| 98 | Cross | Focus trap missing on custom `BottomSheet` / drawer components |
| 99 | Cross | Legal pages "updated: May 21, 2026" future date |
| 100 | Cross | `Privacy/ToS` canonical URL hardcoded to `pm.ontime.build` |

### P3 — Polish

| # | Area | Finding |
|---|---|---|
| P3-a | Global | Product-name inconsistency `Ontime.Build` vs `OnTime.Build` |
| P3-b | Signup | "V1" label in signup sidebar |
| P3-c | Signup | "60 seconds" claim in `SignUpScreen.tsx:267` |
| P3-d | Signup | "200+ construction teams" trust stat appears fabricated |
| P3-e | External | No Ontime branding on external CO approval / view pages |
| P3-f | Install | No branding on `/install` |
| P3-g | GC | `CommandPalette.tsx:27` Profile uses Settings icon |
| P3-h | GC | `DashboardSidebar` — no active state during `/project/*` |
| P3-i | Supplier | Badge status collision (`APPROVED` vs `FULFILLED` same variant) |
| P3-j | Supplier | `MaterialOrders` fallback title "Unknown Work Item" |
| P3-k | Platform | `PlatformQA` — missing layout title/breadcrumbs |
| P3-l | Platform | `PlatformCOScenarios` — bespoke layout, not `PlatformLayout` |
| P3-m | Platform | `PlatformSetup` logo URL — no validation |
| P3-n | Platform | `PlatformOrgs` — no column sorting |

---

## Suggested order of attack (2-week sprint)

**Sprint 1 (safety + signup)**
- All P0 in the Signup + Supplier + Platform sections. Every one is either a data leak or a "customer touches it, sees garbage" issue.
- Delete `GCProjectOverview.tsx` mock data or wire it to real hooks.
- Wire `Settings.tsx:305` Delete Account.
- Flip `onSetPartOfTeam` boolean.
- Consolidate the two signup flows into one; kill the phone tab.

**Sprint 2 (roles + mobile + navigation)**
- All P0 in TC / FC sections. Every one is either a permission leak or a dead-mobile-button.
- Role-aware `ProjectBottomNav` + `ProjectTabBar`.
- `DashboardSidebar` gets RFIs / POs; `MobileBottomNav` gets Financials / POs.
- Fix all `console.log` row handlers on `PlatformGCDashboard`.

**Sprint 3 (craft finish)**
- Empty-state component + wire to every list page.
- Skeleton on the 10 `useQuery` pages that flash blank.
- Kill hardcoded colors in `GCProjectOverview` and `SupplierDashboardView` (largest offenders).
- Real ToS/Privacy `href`s. Consistent product name. Delete "V1" and "60 seconds."

After that: the app is close to something a paying customer can trust. Not before.

---

*End of audit. Come back with the numbered items you want fixed first, and I'll open a build session with a focused plan for each batch.*
