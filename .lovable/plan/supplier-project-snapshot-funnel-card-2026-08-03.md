# Supplier Project Snapshot — Funnel Card

A new large "Project Snapshot" card on the supplier dashboard with a funnel/waterfall chart, scoped to one selectable project, sitting above the existing 5-stage cash pipeline strip (both stay).

## What the user sees

A wide hero card with:

- **Project switcher** — a row of pill tabs (or a select on mobile) listing the supplier's active projects, plus an "All projects" pill for the portfolio roll-up. Defaults to the project with the most activity.
- **Headline block** — project name, risk pill (On Track / Watch / Over Budget), and the two numbers that matter: contract-side Ordered value and Outstanding (billed minus received).
- **Funnel/waterfall chart** — four descending bars: Estimated → Ordered → Billed → Received. Each bar shows its amount and its share of the first stage. Between consecutive bars a small connector label shows the drop-off, e.g. `-$12.4K not billed`, `-$8.1K awaiting payment`. When Ordered exceeds Estimated, that step is drawn upward in red and labeled `+$X over estimate`.
- **Footer strip** — three compact stats for the selected project: over-estimate amount (with pack count when applicable), days since last payment, and upcoming deliveries count.
- **Empty states** — a project with no supplier activity shows a "No estimate or orders yet" message with an "Add estimate →" link instead of an empty chart.

```text
┌──────────────────────────────────────────────────────────────┐
│ PROJECT SNAPSHOT     [All] [Main Street Apts] [Oak Ridge]    │
│ Main Street Apartments   ● Watch                             │
│ Ordered $240K                        Outstanding $46K        │
│                                                              │
│ Estimated  ████████████████████████████  $260K   100%        │
│              ↓ -$20K unordered                               │
│ Ordered    ██████████████████████████    $240K    92%        │
│              ↓ -$60K not billed                              │
│ Billed     ██████████████████            $180K    69%        │
│              ↓ -$46K awaiting payment                        │
│ Received   █████████████                 $134K    52%        │
│                                                              │
│ Over estimate +$8K (2 packs) · Last payment 12d · 3 deliveries│
└──────────────────────────────────────────────────────────────┘
```

Below it, unchanged: the existing Cash Pipeline strip, the "Needs your action" card, metric strip, My Projects, deliveries, forecast table, and the 6 drill-down KPI cards.

## Technical notes

- New component `src/components/dashboard/supplier/SupplierProjectSnapshot.tsx`. Presentational only — it receives the already-computed `dp` rows and `upcomingDeliveries` from `SupplierDashboardView`, so no new queries or hooks and no backend change.
- Selected-project state lives in the new component (`useState`), with an "all" option that sums the rows passed in.
- Chart drawn with plain divs and the existing design tokens (`C`, `fontVal`, `fontMono`, `fontLabel`, `fmt` from `@/components/shared/KpiCard`) rather than recharts — the bars are a simple proportional layout, and this keeps the type/number styling identical to the rest of the dashboard and avoids a chart-library render cost on the dashboard's critical path.
- Bar widths are normalized against `max(estimate, ordered)` so an over-order case still renders in bounds; the over-estimate step uses `C.red`, normal stages use neutral → amber → navy/blue → green matching the existing pipeline tones.
- Mobile: project pills scroll horizontally, bars stack full width, connector labels shrink to a single line; card gets the standard responsive padding used by the sibling supplier cards.
- Rendered in `SupplierDashboardView.tsx` immediately above `<SupplierCashPipeline />`.
