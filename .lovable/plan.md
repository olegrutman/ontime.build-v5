

## Diagnosis (from screenshot)

On the TC dashboard, three different KPI cards expand to show **the same** revenue + cost + margin table:
- **Revenue card** → shows GC Contract, FC Cost, Margin, Margin %  ← off-topic columns
- **Cost card** → shows FC Contract, GC Contract, Margin  ← off-topic columns
- **Gross Margin card** → shows GC Contract, FC Contract, Margin, Margin %  ← (this one is fine, margin needs both sides)

User wants each card's expanded table to show **only what that card is actually about**.

## Scope

Only `src/components/dashboard/TCDashboardView.tsx` needs the focused fix. GC/FC/Supplier expansions are already topic-scoped (verified). The "Gross Margin" card is allowed to keep both columns since margin = revenue − cost by definition.

## Changes — `TCDashboardView.tsx`

**Card 1 — GENERAL CONTRACTOR CONTRACTS (REVENUE)** (lines 122–144)
Drop FC Cost / Margin / Margin % columns. Keep revenue-only context.
```
Columns: Project | General Contractor | Contract Value | % Collected
Rows: per project — name, GC org name, p.revenue, paid/revenue %
Total row: total contracted revenue
```

**Card 2 — FIELD CREW / LABOR CONTRACTS (COST)** (lines 146–163)
Drop GC Contract / Margin columns. Keep cost-only context.
```
Columns: Project | Field Crew | Contract Cost | Paid to Date
Rows: per project — name, FC org name, p.costs, p.paidByYou (or whatever paid-to-FC value exists)
Total row: total FC cost
```

**Card 3 — GROSS MARGIN** (lines 165–187)
Leave as-is. Margin legitimately requires both revenue and cost columns.

**Cards 4–8** — Already topic-scoped (Change Orders, Received, Pending, Materials, Attention). No change.

## Data needed

`pf` (per-project financials) already provides `projectName`, `revenue`, `costs`, `paidToYou`, `pendingToCollect`. I'll need to also surface the GC org name (Card 1) and FC org name (Card 2). I'll check the existing `pf` shape during implementation; if those names aren't on `pf`, I'll fall back to the project name or pull from the same source the project cards use. No new queries.

## Files modified
- `src/components/dashboard/TCDashboardView.tsx` — only the JSX inside Card 1 and Card 2 (~40 lines total).

## Files NOT touched
- `GCDashboardView.tsx`, `FCDashboardView.tsx`, `SupplierDashboardView.tsx` — already focused.
- `KpiCard.tsx` shared component — no API change needed.

## Verification
- Click "Expand for detail" on Revenue → table shows ONLY revenue/collection info, no FC cost columns.
- Click on Cost → table shows ONLY FC cost/payment info, no GC revenue columns.
- Click on Gross Margin → still shows the both-sides comparison (intentional).
- Cards 4–8 unchanged.
- Empty-state rows still render correctly.

