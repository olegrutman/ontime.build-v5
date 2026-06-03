# Dashboard KPI Redesign + Formula Fixes

Mirror the Project Overview "Command Center" pattern at the portfolio level. Replace the flat 5-tile KPI strip with a Hero + 3 grouped summary cards + thin operational strip, and fix the formulas that mislabel cash as margin and ignore approved COs.

## New layout

```text
┌──────────────────────────────────────────────────────────────┐
│  HERO — PORTFOLIO HEALTH                                     │
│  Status pill (On Track / Watch / At Risk)                    │
│  Projected margin $ + %, one-sentence summary                │
├───────────────────┬──────────────────┬──────────────────────┤
│  CONTRACTS        │  CASH FLOW       │  CHANGE ORDERS       │
│  Revised in       │  Received        │  Approved net $      │
│  Revised out      │  Paid out        │  Pending net at risk │
│  Projected margin │  Cash position   │  Count + $ exposure  │
│                   │  Owed to you*    │                      │
│                   │  You owe*        │                      │
├──────────────────────────────────────────────────────────────┤
│  STRIP: Materials POs · Needs Attention · Active Projects    │
└──────────────────────────────────────────────────────────────┘
```

*Owed-to-you splits into **Invoiced awaiting payment** vs **Unbilled remaining** inside the expanded card.

## Formula corrections (portfolio rollup)

| Metric | Before | After |
|---|---|---|
| Gross Margin % | Uses original contracts only | Use **revised contracts** (original + approved COs) on both sides |
| Margin to Date | Labeled margin; actually cash | Rename **Cash Position** = received − paid out. Add true **Realized Margin** = Σ(%complete × revisedContract − incurredCost) in Hero tooltip |
| Pending from GC / to FC | One blob | Split: **Invoiced awaiting payment** vs **Unbilled remaining** |
| CO count only | No $ context | Show **Approved Net $** and **Pending Net at Risk $** as separate values; never blend |
| Materials "0 POs" tile | Wastes prime space | Demote to operational strip; hide when zero |
| No portfolio health signal | User does the math | Status pill driven by role-rules thresholds JSON |

## Status pill thresholds (Hero)

- **Green** — projected margin ≥ 20% AND cash position ≥ 0
- **Amber** — margin 5–20% OR cash position negative but recoverable
- **Red** — margin < 5% OR pending-at-risk > approved-net

Thresholds read from existing `defaultRoleRules.ts` (no new admin UI in this scope).

## Role variants

- **GC** — Hero margin = owner-in vs all-subs-out. Contracts card shows owner contracts + subs total.
- **TC** — Hero margin = GC-in vs (FC + materials)-out. Contracts card shows both sides (Haley / Pacifico style).
- **FC** — Hero margin = TC/GC-in vs labor cost. Contracts card single-sided. Upstream pricing hidden.

## Technical notes

**Files to edit**
- `src/components/dashboard/DashboardKPIs.tsx` — replace 5-tile grid with Hero + 3 cards + strip.
- `src/components/dashboard/DashboardKPIRow.tsx` — archive (replaced) or repurpose as the strip.
- New `src/components/dashboard/overview/PortfolioHealthHero.tsx` (or revive the archived file properly).
- New `src/components/dashboard/overview/PortfolioSummaryStrip.tsx` — 3 grouped cards.
- New `src/components/dashboard/overview/PortfolioOperationalStrip.tsx` — Materials/Attention/Active.
- Whatever portfolio aggregator powers `financials` on Dashboard — extend to expose: `revisedContractIn`, `revisedContractOut`, `projectedMarginRevised`, `cashPosition`, `pendingInvoiced`, `pendingUnbilled`, `coApprovedNet`, `coPendingNetAtRisk`, `realizedMarginAccrual`. Reuse `coAggregation.ts` helpers built for Project Overview.

**Design**: Reuse Command Center tokens — `Barlow Condensed` headings, `IBM Plex Mono` financials, `rounded-2xl` cards, `StatusPill` component, semantic color tokens only (`--success`, `--warning`, `--destructive`).

**Admin layer**: `PlatformKPIs` admin-configurable tiles continue to work — only the *defaults* change and the Hero/zones layer on top.

## Out of scope

- Project Overview (already redesigned in prior step)
- Invoices page, DB triggers, schema changes
- Admin threshold config UI
- Per-project drilldown changes

## Validation

- Snapshot Hero across one GC, one TC, one FC test account to confirm role-correct margin direction.
- Confirm Cash Position renames everywhere "Margin to Date" appeared.
- Confirm approved + pending COs are visually separated (no false-negative blending).
- Confirm GC dashboard does not leak TC margin and FC dashboard does not leak upstream pricing.
