# Why the tile is missing

My previous change added a "Margin to Date" card to `DashboardKPIs.tsx` and `ProjectFinancialCommand.tsx`, but those components are **not** what renders the tiles you see in the screenshots.

The screenshots show the expandable KPI grid, which is rendered by:

- **Dashboard** (`src/pages/Dashboard.tsx`) → `GCDashboardView.tsx` / `TCDashboardView.tsx` / `FCDashboardView.tsx` / `SupplierDashboardView.tsx`. `DashboardKPIs` is only a fallback that never runs for GC/TC/FC/Supplier.
- **Project Overview** (`src/pages/ProjectHome.tsx`) → `GCProjectOverviewContent.tsx` / `TCProjectOverview.tsx` (plus FC variant). `ProjectFinancialCommand` is not the card grid you're looking at.

The data (`marginToDate`, `marginToDatePct`, `marginToDateAmount`) is already computed in `useDashboardData.ts` and `useProjectFinancials.ts` — only the UI wiring is missing.

# Plan

## 1. Dashboard tiles (portfolio level)

Add a "Margin to Date" expandable `KpiCard` to each role view, matching the existing card style (icon, accent color, pills, drill-down table):

- **`TCDashboardView.tsx`** — add as a 9th card (or replace "Gross Margin" projected with side-by-side projected + realized). Value: `financials.marginToDate`. Sub: `${pct}% realized · cash basis`. Drill-down table: per-project `earnedRevenueToDate` / `incurredCostToDate` / margin %.
- **`GCDashboardView.tsx`** — same treatment, GC-flavored copy ("Realized margin from billings vs. costs incurred").
- **`FCDashboardView.tsx`** — show as "Collected vs Labor Cost" (FC has no upstream cost data); value = `receivablesCollected − actualLaborCost`.
- **`SupplierDashboardView.tsx`** — skip (not applicable).

Threshold colors: ≥15% emerald, ≥5% amber, else red (matches existing margin pill convention).

## 2. Project Overview tiles (single project)

Add a "Margin to Date" expandable `KpiCard` to:

- **`GCProjectOverviewContent.tsx`** — sits next to "Your Gross Margin" (projected). Value: `financials.marginToDateAmount`, suffix `${pct}%`. Drill-down: earned revenue rows (billed/collected) − incurred cost rows (paid invoices, delivered POs, labor, approved CO cost).
- **`TCProjectOverview.tsx`** — same, next to "Your Gross Margin" card. Handles T&M mode (uses `approvedWOTotal` as earned, sum of WO costs as incurred — logic already in `useProjectFinancials`).
- **FC overview** (if present) — show "Collected / Contract" only, no realized margin.

Empty state: when `earnedRevenueToDate === 0`, show "—" with sub "No revenue earned yet".

## 3. Cleanup

Remove the now-unused additions from `DashboardKPIs.tsx` and `ProjectFinancialCommand.tsx` so we don't have two sources of truth, OR keep them as the fallback path (decision below).

# Open question

Do you want the new tile to **replace** the existing "Gross Margin" (projected) tile, or **sit alongside** it so you can compare plan vs actual at a glance?

Default in this plan: **sit alongside**, because plan-vs-actual comparison is exactly the value of having "to date" data.

# Files to change

- `src/components/dashboard/GCDashboardView.tsx`
- `src/components/dashboard/TCDashboardView.tsx`
- `src/components/dashboard/FCDashboardView.tsx`
- `src/components/project/GCProjectOverviewContent.tsx`
- `src/components/project/TCProjectOverview.tsx`
- (optional) revert/trim `DashboardKPIs.tsx` + `ProjectFinancialCommand.tsx`

No hook/data/migration changes needed — values already exist.
