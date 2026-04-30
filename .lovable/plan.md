## Why this change

Right now the GC dashboard surfaces **one** materials KPI card ("MATERIALS — GENERAL CONTRACTOR POs") that only shows total PO dollar value and a count. To actually understand the *condition* of material orders across projects, a user has to:

1. Scroll past 8 KPI cards, the Portfolio Metrics table, and Needs Attention,
2. Pick a project,
3. Open the Buyer Materials Analytics section inside that project.

That's three clicks and a lot of scrolling to answer simple, daily questions a GC actually asks every morning:

- "Is anything **late** today?"
- "Did a supplier **re-price** something on me?"
- "How much cash am I **about to owe** for materials this week?"
- "Which **project** is the materials risk concentrated in?"

The existing per-project `BuyerMaterialsAnalytics` already computes all of this. The dashboard just doesn't aggregate it. This change rolls those signals up to the portfolio level and puts them where the eye lands first — directly under the hero, before the generic KPI grid.

## Real-world design change

Add a **"Materials Pulse"** strip — a single, dense, horizontal band of 4 traffic-light tiles + a per-project hot-list — placed directly under `DashboardHero` and above the existing `KpiGrid`.

```text
┌─ Hero ─────────────────────────────────────────────────────────┐
└────────────────────────────────────────────────────────────────┘
┌─ MATERIALS PULSE ──────────────────────────── this week ▾ ────┐
│  🚦 Late      💲 Re-priced   💵 Due ≤14d    📦 In Transit     │
│   2 POs       +$1.4k         $48k          5 POs / $22k       │
│   $12k @risk  3 of 41 lines  31-60d: $8k   ETA today: 2       │
│  [RED]        [AMBER]        [AMBER]        [GREEN]            │
├────────────────────────────────────────────────────────────────┤
│  Hot projects (materials risk)                                 │
│  • Main St Apartments    Late 2 · Re-priced +$900   →         │
│  • 5 Cherry Hills Park   Due $22k in 9 days         →         │
└────────────────────────────────────────────────────────────────┘
```

Why these four tiles (and not more):

- **Late** — the only metric that costs schedule. Red the moment count > 0.
- **Re-priced by supplier** — catches silent margin erosion. The user explicitly said the existing per-project version of this works; surface it portfolio-wide.
- **Cash due ≤14 days** — answers "do I have enough in the bank Friday." Pulled from the existing aging buckets.
- **In transit / ETA today** — the positive signal. Stops the strip from being a wall of red and tells the field team what's arriving.

Each tile is **clickable** — tapping it deep-links to a filtered Purchase Orders view (`/purchase-orders?filter=late` etc.) so it's not a dead-end summary. The hot-projects row is the bridge between portfolio rollup and per-project drill-down: at most 3 rows, each linking straight into that project's Materials section.

Mobile: tiles stack 2×2, hot-projects row becomes a vertical list, font sizes drop to match the existing `BuyerMaterialsAnalyticsSection` mobile pattern (already established in memory).

The existing "MATERIALS (GENERAL CONTRACTOR POs)" card in the KPI grid stays — it answers "how much have I committed?" which is a different question (financial commitment vs. operational health). Users have told us they want both.

## How I'll build it

### Files to add

1. **`src/hooks/useMaterialsPulse.ts`** — portfolio aggregator. Iterates active projects, calls the existing per-project analytics resolvers (`useBuyerMaterialsAnalytics` already does the heavy lifting per project), and returns:
   ```ts
   { lateCount, lateValue, repricedDelta, repricedLineCount, repricedTotalLines,
     dueNext14Days, agingD31_60, inTransitCount, inTransitValue, etaToday,
     hotProjects: [{ projectId, name, reason, value }] }
   ```
   To avoid N round-trips, refactor the per-project query in `useBuyerMaterialsAnalytics` into a shared SQL function that accepts an array of project IDs (or run a single multi-project query joining `purchase_orders`, `po_items`, and the existing PO stage view). RLS is unchanged — we only return rows the user can already see.

2. **`src/components/dashboard/MaterialsPulseStrip.tsx`** — pure presentational. Reuses `KpiCard`, `Pill`, `C` color tokens, `fontMono`/`fontLabel` from `@/components/shared/KpiCard` to match the established Command Center style. No new design tokens.

### Files to edit

- **`src/components/dashboard/GCDashboardView.tsx`** — insert `<MaterialsPulseStrip />` between the `<DashboardHero />` block (line ~131) and the `<OnboardingChecklist />` / `<KpiGrid>` block. Pass `projects` and the new hook's data.
- **`src/components/dashboard/TCDashboardView.tsx`** — same insertion, scoped to TC's POs (TCs also order materials).
- **`src/components/dashboard/index.ts`** — export.

### Out of scope (to keep this focused)

- No business-logic changes. Aggregation reuses the formulas already validated in `useBuyerMaterialsAnalytics` (memory: *Supplier: Dashboard*).
- No changes to the per-project Buyer Materials Analytics section — only adds a portfolio rollup above it.
- No changes to the existing Materials KPI card in the KPI grid (different question, both kept).
- FC and Supplier dashboards unchanged (they have their own, role-appropriate materials views per memory).

### Validation

- Visual QA at 1920px and 390px viewports (matches existing mobile optimization rules in memory).
- Confirm each tile's deep-link actually filters the destination page; if the filter param doesn't exist yet on `/purchase-orders`, fall back to the unfiltered page + scroll-to-section (and note it as a follow-up rather than blocking this PR).
- Sanity-check totals against opening one project's Buyer Materials Analytics card — the portfolio rollup should equal the sum of per-project values.
