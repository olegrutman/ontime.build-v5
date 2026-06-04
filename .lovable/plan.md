# Dashboard Redesign — Projects as the Hero

## Goal
Make projects the focal point of the dashboard. The user opens the dashboard to *go to a project*, not to study aggregates. Aggregates stay, but move below.

## New layout (top → bottom)

```text
┌──────────────────────────────────────────────────────────────┐
│ Compact Health Hero (1 row)                                  │
│ ● On Track · Projected Margin $X (Y%) · "summary sentence"   │
├──────────────────────────────────────────────────────────────┤
│ MY PROJECTS (4)                          [+ New Project]     │
│ ┌──────────────────────┐ ┌──────────────────────┐            │
│ │ ● Henderson  On Track│ │ ● Fuller     Watch   │            │
│ │ 45% complete ▓▓▓▓░░  │ │ 72% complete ▓▓▓▓▓▓░ │  ← RICH    │
│ │ Contract Cost Margin │ │ Contract Cost Margin │   CARDS    │
│ │ $233K  $160K  $72K   │ │ $X     $X     $X     │            │
│ │ → Review CO-003      │ │ → Approve invoice    │            │
│ └──────────────────────┘ └──────────────────────┘            │
├──────────────────────────────────────────────────────────────┤
│ Action Required (1) · Needs Attention (1)   [inline strip]   │
├──────────────────────────────────────────────────────────────┤
│ PORTFOLIO INSIGHTS                                           │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Contracts │ Cash Flow │ Change Orders   (summary strip)  │ │
│ ├──────────────────────────────────────────────────────────┤ │
│ │ COs · Received · Pending · Materials  (existing KPIs)    │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## Changes

### 1. Compact the Health Hero
- Current `ProjectHealthHero` is tall (status + big margin + summary stack).
- New `CompactHealthHero` variant: single row — status pill · projected margin $/% · one-line summary. ~80px tall vs current ~180px.
- Keep the full hero on individual Project Overview pages.

### 2. Rich Project Cards (new component)
Replace today's slim `Contract/Cost/Margin` card with `RichProjectCard`:
- **Header**: project name + status pill (Active/Paused) + **health pill** (On Track / Watch / At Risk) using same `computeHealthStatus` we built for Project Overview.
- **Progress row**: % complete bar (derived from SOV billed % — already in `useProjectSOV`).
- **Financials row**: Revised Contract · Cost to Date · Projected Margin (with margin %).
- **Next action footer**: smart CTA pulled from existing data:
  - Pending CO → "Review CO-XXX"
  - Invoice awaiting approval → "Approve INV-XXX"
  - Action Required item for this project → that action
  - Else: "View project →"
- 2-column grid on desktop, 1-column on mobile. ~220px tall cards.

### 3. Reorder the dashboard view files
For `GCDashboardView`, `TCDashboardView`, `FCDashboardView`:
- **Old order**: PortfolioOverviewHeader (full hero + summary strip) → KPI grid → Action Required → My Projects
- **New order**: CompactHealthHero → My Projects (rich cards) → Action Required (slim inline strip) → Portfolio Insights section containing the existing `OverviewSummaryStrip` + `DashboardKPIs` grid

### 4. Inline "Action Required" strip
Today it's a full card section. Compact it to a 1-line strip with counts + chevron to expand. Saves ~120px above the fold.

### 5. Portfolio Insights wrapper
Wrap the existing summary strip + KPI grid in a labeled section ("Portfolio Insights") so the visual hierarchy reads: *project-level → portfolio-level*. No data changes, just framing.

## Files

**New**
- `src/components/dashboard/CompactHealthHero.tsx` — 1-row variant of ProjectHealthHero
- `src/components/dashboard/projects/RichProjectCard.tsx` — new card with health pill, progress, financials, next-action CTA
- `src/components/dashboard/projects/useProjectNextAction.ts` — small hook that resolves the smart CTA per project from existing pending COs / invoices / attention items
- `src/components/dashboard/PortfolioInsightsSection.tsx` — collapsible wrapper around existing summary strip + KPI grid (default expanded on desktop, collapsed on mobile)

**Edited**
- `src/components/dashboard/GCDashboardView.tsx` — reorder
- `src/components/dashboard/TCDashboardView.tsx` — reorder
- `src/components/dashboard/FCDashboardView.tsx` — reorder
- `src/components/dashboard/overview/PortfolioOverviewHeader.tsx` — split into `CompactHealthHero` + standalone `OverviewSummaryStrip` so each can be placed independently

**Untouched**
- `useDashboardData.ts` formulas (already correct from previous pass)
- `DashboardKPIs.tsx` (kept as-is inside Portfolio Insights)
- Project Overview page (already redesigned)
- Mobile dashboards (cards stack 1-col, same order)

## Role variants
- **GC**: rich cards show owner contract / cost / margin · CTA priorities: pending CO from TC, owner invoice to send
- **TC**: rich cards show GC contract / FC+materials cost / margin · CTA priorities: pending CO awaiting submit, FC invoice to approve
- **FC**: rich cards show TC/GC contract / labor cost / margin · CTA priorities: invoice awaiting TC approval, pending CO assignment
- Role-based privacy preserved — no upstream pricing leaks on FC cards.

## Out of scope
- Split-screen layout (Option A) — rejected for scalability reasons
- Changing project data, contract logic, or formulas
- Project Overview redesign (already shipped)
- Mobile navigation changes

## Validation
- Visually confirm projects-first hierarchy on GC/TC/FC test accounts
- Confirm health pill + next-action CTA appears on each card
- Confirm Portfolio Insights section still shows all current KPI data
- Confirm no regression in mobile stacking order
