# Project Overview KPI Redesign + Formula Fixes

Rebuild the Project Overview KPI grid as a 3-zone command center and correct the financial formulas behind it. Scope: Project Overview page only (TC, GC, FC variants). Dashboard portfolio rollups, invoices page, and DB triggers are out of scope.

## New layout

```text
┌──────────────────────────────────────────────────────────────┐
│  HERO — PROJECT HEALTH                                       │
│  Big projected margin $ + % + status pill (green/amber/red)  │
│  One-sentence summary ("On track · 31% projected margin")    │
├───────────────────┬──────────────────┬──────────────────────┤
│  CONTRACT         │  CASH FLOW       │  CHANGE ORDERS       │
│  Revised in       │  Received        │  Approved net        │
│  Revised out      │  Paid out        │  Pending net (risk)  │
│  Projected margin │  Cash position   │  Count + $ at risk   │
│                   │  Owed to you     │                      │
│                   │  You owe         │                      │
├──────────────────────────────────────────────────────────────┤
│  THIN STRIP: Team · Docs · Activity (small, low-weight)      │
└──────────────────────────────────────────────────────────────┘
```

Each of the 3 main cards is expandable for the existing drilldown detail. Hero is non-expandable, always-on summary.

## Formula corrections

| Metric | Before | After |
|---|---|---|
| Projected margin | Original contracts only | Revised contracts (original + approved COs) on both sides |
| CO Net Margin (single tile) | Mixes approved revenue with pending cost → false negatives | Split: **Approved Net** (approved rev − approved cost) and **Pending Net at Risk** (pending rev − pending cost). Never blended |
| "Margin to Date" label | Says "realized margin" but is cash | Rename to **Cash Position** (collected − paid). True realized margin = `%complete × revisedContract − incurredCost` shown inside Hero card tooltip |
| Pending from GC | Contract − collected (blob) | Split: **Invoiced & awaiting payment** vs **Unbilled remaining** |
| Pending to FC | Same flaw mirrored | Same split |
| Retainage | Hidden inside contract math | Surfaced as its own line in Cash Flow card |

## Status pill thresholds (Hero card)

- Green: projected margin ≥ target (default 20%) AND cash position ≥ 0
- Amber: margin 5–20% OR cash position negative but recoverable
- Red: margin < 5% OR pending-at-risk > approved-net

Thresholds read from existing role rules JSON (no new admin UI in this scope).

## Role variants

- **TC**: Hero = projected margin between GC-in and FC+materials-out. Contract card shows both contracts (Haley / Pacifico style).
- **GC**: Hero = projected margin between owner-in and all-subs-out. Contract card shows owner contract + subs total.
- **FC**: Hero = projected margin between TC/GC-in and labor cost. Contract card single contract.

## Technical notes

**Files to edit**
- `src/hooks/useProjectFinancials.ts` — add `revisedGCTotal`, `revisedFCTotal`, `projectedMarginRevised`, split `pendingInvoiced` vs `pendingUnbilled`, split `coApprovedNet` vs `coPendingNetAtRisk`, keep `cashPosition` (rename of current marginToDate cash calc), add `realizedMarginAccrual` for tooltip.
- `src/components/project/TCProjectOverview.tsx` — replace 10-tile grid with 3-zone layout. Reuse existing expand-drilldown pattern.
- `src/components/project/GCProjectOverviewContent.tsx` — same 3-zone layout, GC variant.
- `src/components/project/FCProjectOverview.tsx` — same 3-zone layout, FC variant.
- New `src/components/project/overview/HeroHealthCard.tsx`, `ContractCard.tsx`, `CashFlowCard.tsx`, `ChangeOrdersCard.tsx` — shared primitives, role-aware via props.
- `src/components/project/overview/TeamDocsStrip.tsx` — thin strip for team/docs/activity tiles that previously had equal weight.

**Design tokens**: Reuse Command Center language — `Barlow Condensed` headings, `IBM Plex Mono` financials, `rounded-2xl`. Status pill uses semantic tokens (`--success`, `--warning`, `--destructive`).

**Out of scope**: dashboard portfolio cards, invoices page, DB triggers, schema changes, admin threshold config UI.

## Validation

- Snapshot the 3 hero cards against a TC project with mixed approved + pending COs to confirm no negative-margin false alarms.
- Confirm GC view does not leak TC margin (existing privacy rules unchanged).
- Confirm FC view shows labor-vs-contract margin and hides upstream pricing.
