# Add "Profit Margin to Date" KPI

## What's missing today

The current KPIs show **projected** margin (Revenue − planned costs) but never a **realized / running** margin: i.e. what we've actually billed and collected vs. what we've actually spent so far. Users want a live "how am I doing right now" number that updates as invoices, POs, and labor costs accumulate.

## Definitions (role-aware)

Margin to date = `(Earned Revenue to Date − Incurred Cost to Date) / Earned Revenue to Date`

Where:

**Earned Revenue to Date** (money in/billed, excluding retainage held):
- **GC viewer**: subtotal of submitted+approved+paid invoices *received from TCs is not revenue* — instead, revenue earned = GC's billed amount to Owner (upstream contract billings). If no Owner invoicing, fall back to `% SOV complete × revised contract`.
- **TC viewer**: subtotal of submitted/approved/paid invoices on upstream (TC→GC) contract. Plus approved CO revenue billed.
- **FC viewer**: subtotal of submitted/approved/paid invoices on FC's upstream contract.

**Incurred Cost to Date** (money out, actual):
- Approved/paid invoices on downstream contracts (subs/FCs bills to you)
- Paid + delivered PO totals (materials)
- Actual labor cost (`actualLaborCost` already in hook)
- Approved CO cost portion (`approvedCOCost`)

All these values already exist in `useProjectFinancials` — we just need to derive the ratio.

## Approach

### 1. Extend `useProjectFinancials.ts`
Add three computed fields to `ProjectFinancials`:
- `earnedRevenueToDate: number`
- `incurredCostToDate: number`
- `marginToDate: number` (percent; 0 if revenue=0)
- `marginToDateAmount: number` (dollars)

Compute role-aware at the bottom of `fetchData` using existing state (no new queries needed for v1). For GC, use `receivablesCollected + receivablesInvoiced` patterns already used elsewhere; for TC reuse `receivablesInvoiced/payablesInvoiced`; for FC use `receivablesCollected`.

### 2. Aggregate across projects in `Dashboard.tsx`
The dashboard's `financials` aggregate sums `totalRevenue`, `totalCosts`, `paidByYou`, `paidToYou` across all projects. Add two new aggregates:
- `earnedToDate` = Σ project.earnedRevenueToDate
- `incurredToDate` = Σ project.incurredCostToDate
- `runningMargin` = (earned − incurred) / earned

### 3. Add KPI tile

**Dashboard (`DashboardKPIs.tsx`)**: replace or supplement the "Projected Margin" tile with a second one "Margin to Date" so users see both projected vs realized side-by-side. Use existing `KPICard`, color-code with the same thresholds (≥15 emerald, ≥5 amber, else red). FC view: skip (no cost data on their side) or show simple "Collected vs Outstanding" only.

**Project Overview (`ProjectFinancialCommand.tsx`)**: add a 6th KPI card in the GC and TC grids: **"Margin to Date"** with value = `marginToDateAmount` and suffix = `${pct}%`. Subtitle: "Realized · live". Keep the existing "Projected Gross Margin" so users can compare plan vs actual at a glance.

### 4. Edge cases
- Revenue = 0 → show "—" instead of `0%` / `NaN`.
- T&M mode: use `approvedWOTotal` as earned revenue, sum of WO costs as incurred.
- Supplier role: not applicable, hide.
- FC role: cost data is mostly off-platform, so show "Collected / Contract" instead of a true margin (already the case).

## Files to change

- `src/hooks/useProjectFinancials.ts` — add 4 computed fields
- `src/pages/Dashboard.tsx` — aggregate the new fields across projects
- `src/components/dashboard/DashboardKPIs.tsx` — add "Margin to Date" tile for GC + TC
- `src/components/project/ProjectFinancialCommand.tsx` — add 6th KPI card for GC + TC, plus T&M variant

## Out of scope
- New DB columns or migrations (all data already in the hook)
- Historical trend chart of margin over time (could be a follow-up)
- Per-CO margin breakdown (already on CO detail page)

## Open question
Do you want to **replace** the existing "Projected Margin" tile with "Margin to Date", or **show both** so users can compare plan vs actual? Default in this plan: show both.
