## What changes

Today the Supplier dashboard opens with a 50/50 wall of six identical KPI tiles. Every number is equally loud, the at-risk projects are buried below the fold, and there's no visual story tying ordered → billed → received together. The new layout leads with a single "where the money is right now" picture and pushes risk + deliveries above the drill-downs.

## New page order

```text
┌─────────────────────────────────────────────────────────┐
│  Hero (navy)  ·  Good morning, Greg  ·  status chips    │
├─────────────────────────────────────────────────────────┤
│  CASH PIPELINE  (the new hero)                          │
│  [Estimated] → [Ordered⚠+$6.2K] → [Billed] →            │
│      [Received] → [Outstanding]                         │
├─────────────────────────────────────────────────────────┤
│  Metric strip · Active · Over-budget · Deliveries · Avg │
│                                                         │
│  Project Budget Forecast  (promoted up)                 │
│  Scheduled Deliveries     (promoted up)                 │
├─────────────────────────────────────────────────────────┤
│  Drill down into each stage                             │
│  [Estimate] [Ordered] [Over] [Billed] [Received] [AR]   │
│  (existing 6 expandable KPI cards, unchanged)           │
│                                                         │
│  Active Projects grid (unchanged)                       │
└─────────────────────────────────────────────────────────┘
```

## Components to add

1. **`src/components/dashboard/supplier/SupplierCashPipeline.tsx`** — 5-stage horizontal pipeline. Each stage shows label, count-up animated value, sub-line (% conversion to previous stage), and an inline flag chip when something's off (e.g. "+$6.2K over" on Ordered). Stages are visually connected by a small chevron between cells. Tone per stage: Estimated neutral, Ordered amber if over-ordered, Billed navy (primary emphasis), Received green, Outstanding red if > 0 else green. Stacks 1-col on mobile, 2-col on small, 5-col on lg.

2. **`src/components/dashboard/supplier/SupplierMetricStrip.tsx`** — Compact 4-up secondary KPIs that *don't* fit the pipeline narrative: Active Projects, Over-Budget count, Upcoming Deliveries, Avg Days Since Payment. Smaller cards, no expand affordance.

## Component to edit

**`src/components/dashboard/SupplierDashboardView.tsx`** — reorder the JSX below the hero/onboarding to: `<SupplierCashPipeline />` → `<SupplierMetricStrip />` → Project Budget Forecast block → Scheduled Deliveries block → existing `<KpiGrid>` with a small "Drill into each stage" section label → Active Projects grid. Add a derived `avgDaysSincePayment` from `dp` (mean of non-null `daysSinceLastPayment`). All existing data math is reused unchanged.

## Out of scope

- No changes to `useSupplierDashboardData`, business logic, or data shape.
- No changes to GC/TC/FC dashboards.
- Sidebar, topbar, and DashboardHero stay as is.
- The 6 expandable KPI cards keep their full tables — just demoted below the pipeline as drill-downs.

## Technical notes

- Uses existing design tokens from `@/components/shared/KpiCard` (`C`, `fontVal`, `fontMono`, `fontLabel`, `fmt`) — no new color values.
- Count-up via `requestAnimationFrame` with easeOutCubic, ~700ms, no library.
- Pipeline cell hover = subtle `-translate-y-0.5` lift; connector dots between cells hidden below `md`.
- Fully responsive: 1 → 2 → 5 cols, no inline `gridTemplateColumns` overrides (lesson from prior mobile fixes).
