## Goal
Transform the app from a feature-dump into a verb-driven, role-aware workspace. Ship in 4 phases so each phase is usable on its own and nothing breaks mid-flight.

---

## Phase 1 — Global IA: 4 verbs instead of 15 nouns

Replace the current top-level sidebar with 4 sections:

```text
WORK       → inbox, approvals, items assigned to me
PROJECTS   → list of projects → click into a project workspace
MONEY      → portfolio financials (margin, cash, AR/AP)
NETWORK    → team + partners (TCs, FCs, suppliers, owners)
```

Project-scoped pages (SOV, COs, RFIs, Invoices, POs, Returns, Backcharges, Payment Apps, Reminders) move **inside** the project workspace and disappear from the global nav.

Settings stays as a footer icon. Role label moves out of the gray subtitle and into a colored chip next to the org name.

**Files**
- `src/components/layout/AppSidebar.tsx` (or equivalent) — collapse menu
- `src/App.tsx` routes — keep old URLs working via redirects to new homes
- `src/components/layout/Header.tsx` — role chip + primary CTA slot

---

## Phase 2 — Project workspace: 5 tabs, not 15 nav items

Inside a project, replace the long left nav with a tab bar:

```text
PULSE   Today + health + needs-attention
SCOPE   SOV, Change Orders / Work Orders, RFIs
MONEY   Invoices, POs, Payment Apps, Returns, Backcharges, Owner Billings
FIELD   Daily logs, photos, schedule, field crew
DOCS    Contracts, drawings, exports, settings
```

Each tab is a single route with sub-sections inline (accordion or secondary chips), not deeper nav.

**Files**
- New: `src/components/project/ProjectWorkspace.tsx` (tab shell)
- New: `src/components/project/tabs/{Pulse,Scope,Money,Field,Docs}.tsx`
- Move existing route components in as panes; keep their hooks untouched
- `src/components/project/ProjectSidebar.tsx` — slim to icon-only mini-rail or remove

---

## Phase 3 — Dashboard redesign: kill the 8-tile grid

New 3-zone layout on `/dashboard`:

```text
┌────────────────────────────────────────────────────────────┐
│ TODAY BAR  — one role-aware sentence + 1 primary CTA       │
├──────────────────────────────────┬─────────────────────────┤
│ PORTFOLIO PULSE (60%)            │ CASH STRIP (40%)        │
│  - active projects, ranked       │  - in / out / net 30d   │
│    by attention needed           │  - upcoming bills       │
│  - inline mini-sparkline + state │  - upcoming collections │
└──────────────────────────────────┴─────────────────────────┘
```

The current 4×2 KPI grid moves to `/dashboard/metrics` for power users (one click away, not gone).

**Today bar copy is role-aware**
- GC: "3 TC invoices need approval · $48k due to owner this week"
- TC: "1 CO awaiting GC approval · 2 FC payables due Friday"
- FC: "Log today's hours · 1 WO open on Project X"
- Supplier: "2 POs to confirm · 1 delivery scheduled tomorrow"

**Files**
- `src/pages/Dashboard.tsx` — restructure to 3 zones
- New: `src/components/dashboard/TodayBar.tsx`
- New: `src/components/dashboard/PortfolioPulse.tsx`
- New: `src/components/dashboard/CashStrip.tsx`
- New route: `src/pages/DashboardMetrics.tsx` (lifts existing KPI grid as-is)

---

## Phase 4 — Role as spine + color discipline + action rail

**Role accent color** flows through the shell:
- GC = navy, TC = amber, FC = green, Supplier = violet
- Applied to: active nav state, primary CTA, role chip, today bar accent
- New tokens in `src/index.css`: `--role-accent`, `--role-accent-foreground`, set per-role in a context provider

**Color = state, not decoration** audit
- Red = blocker / overdue
- Amber = needs your action
- Green = healthy / collected
- Neutral = informational
- One pass through KPI cards to strip decorative color

**Action rail** (280px, right side, persistent on dashboard + project pulse)
- Top: 3 items assigned to me
- Middle: "Recently touched"
- Bottom: quick-add (+ Invoice, + PO, + CO, + Daily Log) — role-aware list

**Files**
- New: `src/contexts/RoleThemeContext.tsx`
- `src/index.css` — role accent tokens
- New: `src/components/layout/ActionRail.tsx`
- Audit pass: every `*Card.tsx` under `src/components/dashboard/` and `src/components/project/`

---

## Out of scope (explicit)
- Mobile redesign (bottom tabs, camera-first capture) — flagged for a later phase, not built here
- No new business logic, no schema changes, no new financial formulas
- Existing URLs keep working via redirects; no data migration

---

## Order of operations
1. **Phase 2 first** (project tabs) — highest impact, contained blast radius, unlocks everything
2. **Phase 3** (dashboard) — most visible win
3. **Phase 1** (global IA) — touches every route, do once tabs prove the pattern
4. **Phase 4** (role spine + rail + color audit) — polish layer over the new bones

Each phase is independently shippable. After each phase I'll stop and let you click around before moving on.
