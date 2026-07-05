
# App Audit — Per-Role, Every Page, Report Only

## What you get

One written report (Markdown document, saved to the repo as `AUDIT.md` so you can read, share, and check items off). No code changes in this pass. You decide afterward what to fix and in what order.

## Roles I will audit separately

1. **Visitor / Not signed in** — landing, marketing, legal, signup, login, forgot password, email verification, invite acceptance.
2. **General Contractor (GC)** — the "power user" role. Most features.
3. **Trade Contractor (TC)** — dual-contract user (has upstream GC + downstream FC).
4. **Field Crew (FC)** — labor-focused, work-order-driven.
5. **Supplier** — materials, POs, quotes, returns, inventory.
6. **Platform Admin** — internal ops (`/platform/*`).

For each role I record what they see, what's broken, what's confusing, and what's below the standard set by leading SaaS.

## Benchmarks I will compare against

- **Signup / onboarding:** Linear, Notion, Vercel, Stripe, Figma.
- **Dashboard + navigation:** Linear, Height, Monday.
- **Project / job management:** Procore, Buildertrend, CompanyCam.
- **Financials (invoices, POs, change orders):** QuickBooks, Stripe Dashboard, Ramp.
- **Empty states, loading, error handling:** Linear, Stripe (industry gold standard).
- **Mobile / tablet responsive behavior:** Notion, Linear mobile.

## How I will do it (methodology)

For every page I visit I check the same 12 things, so the report is consistent and comparable:

```text
1.  Page loads without console errors
2.  Loading state (skeleton vs spinner vs blank)
3.  Empty state (first-time user with no data)
4.  Error state (network fail, permission denied)
5.  Every button — does it do what its label says?
6.  Every link — does it go somewhere real?
7.  Every form — validation, error messages, success feedback
8.  Role-appropriate data (no leaks, no missing sections)
9.  Mobile (390px) + tablet (799px) + desktop layout
10. Keyboard + accessibility basics (focus, labels, contrast)
11. Copy quality (professional, no placeholder text, no dev jargon)
12. Comparison to how a leading app handles the same thing
```

Signup gets extra scrutiny because it's the #1 churn point.

## Report structure

```text
AUDIT.md
├── 0. Executive summary
│     - Overall readiness score per role (0–10)
│     - Top 5 blockers across the whole app
│     - Top 5 "embarrassing in a demo" issues
│
├── 1. Signup & onboarding (deep dive)
│     - Step-by-step walkthrough vs Linear/Notion/Stripe
│     - Every field, every validation, every email
│     - Google OAuth flow
│     - Invite-acceptance flow
│     - Email verification UX
│     - First-run experience after signup (empty dashboard)
│     - Verdict + concrete gap list
│
├── 2. Visitor / logged-out pages
│     - Landing, legal, /auth, /signup, /reset-password,
│       /verify-email, /auth/callback, /unsubscribe, /install
│
├── 3. General Contractor
│     3.1 Dashboard
│     3.2 Projects list + create project + project setup wizard
│     3.3 Project overview
│     3.4 SOV, Invoices, POs, Change Orders, RFIs, Daily Logs
│     3.5 Team, Partner Directory, Suppliers
│     3.6 Settings, Financials, Reminders, Notifications
│
├── 4. Trade Contractor
│     - Same page list, but flagged where TC experience diverges
│     - Dual-contract views, markup privacy, WO/CO behavior
│
├── 5. Field Crew
│     - T&M mode, Work Orders, Quick Capture, Field Captures,
│       Daily Log, mobile-first flows
│
├── 6. Supplier
│     - Supplier Inventory, Supplier Estimates, PO responses,
│       Returns, Materials Health dashboard, cross-org visibility
│
├── 7. Platform Admin
│     - /platform/* pages, impersonation, support actions,
│       QA tools, plans, roles, KPIs
│
├── 8. Cross-cutting issues
│     - Design consistency (typography, spacing, tokens)
│     - Loading + empty + error state coverage matrix
│     - Mobile responsiveness matrix
│     - Notification system coverage
│     - Permission leaks / RLS concerns worth manual review
│     - Dead code / dead routes / dead buttons
│
└── 9. Prioritized backlog
      P0 Blockers        — ship-stoppers, must fix before customers
      P1 Broken          — works but wrong, users will complain
      P2 Below standard  — works, but not what leading apps do
      P3 Polish          — nice-to-have, brand/craft level
      Each item: page, role, finding, benchmark, suggested fix,
      rough effort (S/M/L).
```

## How I will gather the evidence

- Read the route tree in `src/App.tsx` to enumerate every page.
- Read every page component in `src/pages/**` and its main child components.
- For each role, trace what the role gates (`RequireOrgType`, `useOrgType`, `useAuth`, `hasRole`) actually show/hide.
- Drive the running preview headlessly (Playwright) for the signup flow and a handful of high-value pages per role, using the pre-injected Supabase session where available, to capture real screenshots and console/network errors — not just a code read.
- Cross-reference against the memory notes already recorded for this project (financials, SOV, CO/WO, invoicing, etc.) so I don't flag intentional design decisions as bugs.

## What is NOT in this pass

- No code changes.
- No database migrations.
- No design mockups or redesigns — findings only, with references to how leaders solve the same problem.
- No security pentest (I will note obvious concerns but this isn't a security audit).
- No performance profiling beyond "this page feels slow / this query is obviously heavy."

## What I need from you to start

Nothing. I have enough context. On approval I will produce `AUDIT.md` in one pass. It will be long — expect 15–25 pages of dense findings — because you asked for every page, every role.

## After you read the report

You come back and say "fix P0 items 1, 3, 7 and P1 item 2" (or "rebuild signup"), and I do that in a separate build session with a focused plan.
