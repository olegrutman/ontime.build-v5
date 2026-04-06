

# Wire Real Data into KPI Cards (GC + TC Dashboards)

## Problem

Both `GCDashboardView` and `TCDashboardView` currently show real aggregate totals (revenue, costs, margin) in the card headers, but the **expand tables inside the cards** are either hardcoded demo arrays (TC) or only partially wired (GC). The TC dashboard has ~80 lines of `DEMO_*` constants that never change regardless of actual database state.

## What I'll Do

Replace hardcoded demo data in expand tables with real per-project breakdowns derived from data already available via props (`projects`, `financials`, `recentDocs`, `attentionItems`, `billing`). Where the hook doesn't provide per-project financial detail (e.g. per-project costs, per-project paid amounts), I'll enhance `useDashboardData` to expose that granularity.

## Step 1: Enhance `useDashboardData` to expose per-project financials

Add a new `projectFinancials` map to the hook's return value:

```ts
interface ProjectFinancialDetail {
  projectId: string;
  projectName: string;
  revenue: number;      // contract where org is from_org (TC/FC) or owner_contract_value (GC)
  costs: number;        // contract where org is to_org (TC downstream) or from_org (GC paying TCs)
  paidByYou: number;    // PAID invoices where org paid out
  paidToYou: number;    // PAID invoices where org received
  pendingToCollect: number; // SUBMITTED/APPROVED invoices owed to org
  pendingToPay: number;     // SUBMITTED invoices org owes
}
```

This data is already being queried (contracts, invoices per project) — I just need to aggregate it per-project instead of only globally.

## Step 2: Wire `GCDashboardView` expand tables to real data

All 8 cards already use real data for headers. The expand tables also use real data from `projects`, `recentDocs`, `attentionItems`. **GC is mostly done** — minor improvements:
- Card 1 (Owner Budget): already shows real projects ✓
- Card 2 (Margin): already shows real metrics ✓
- Card 3 (COs): already shows real COs from `recentDocs` ✓
- Card 4 (Materials/POs): already shows real POs ✓
- Card 5 (Attention): already shows real items ✓
- Card 6 (Paid): already shows real invoices ✓
- Card 7 (Pending): already shows real pending invoices ✓
- Card 8 (TC Contracts): already shows real contracts ✓

Only enhancement: use `projectFinancials` for richer per-project data in Cards 1-2.

## Step 3: Wire `TCDashboardView` expand tables to real data

This is the main work. Replace all `DEMO_*` constants with real data:

| Card | Current | After |
|------|---------|-------|
| 1 — GC Contracts | `DEMO_PROJECTS` hardcoded | Real `projects` with per-project revenue/cost from `projectFinancials` |
| 2 — FC/Labor Costs | `DEMO_PROJECTS` hardcoded | Same real per-project data, cost column focused |
| 3 — Gross Margin | `DEMO_PROJECTS` hardcoded | Same real per-project margin calculations |
| 4 — CO Net Margin | `DEMO_COS` hardcoded | Real COs from `recentDocs` (CO amounts from change_orders table) |
| 5 — Received from GC | `DEMO_RECEIVED` hardcoded | Real per-project `paidToYou` from `projectFinancials` |
| 6 — Pending from GC | `DEMO_PENDING_INVOICES` hardcoded | Real pending invoices from `recentDocs` filtered to SUBMITTED status |
| 7 — Material Budget | `DEMO_MATERIALS` hardcoded | Real POs from `recentDocs` grouped by project |
| 8 — Open RFIs | `DEMO_RFIS` hardcoded | Show attention items; RFI data not yet available in hook (show "—" gracefully) |

**Warnings section**: Use real `attentionItems` (already partially done), remove `DEMO_WARNINGS` fallback.

**Projects grid**: Already uses real `projects` — no change needed.

## Step 4: Graceful empty states

When real data is empty, cards show "—" values and expand tables show "No data yet" rows instead of demo data. This makes the dashboard honest about actual state.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useDashboardData.ts` | Add `projectFinancials` map with per-project revenue/cost/paid breakdown |
| `src/components/dashboard/TCDashboardView.tsx` | Remove all `DEMO_*` constants, wire 8 cards + warnings to real data from props |
| `src/components/dashboard/GCDashboardView.tsx` | Minor: use `projectFinancials` for richer Card 1-2 expand tables |

### What is NOT changing
- Database schema, RLS
- Routes
- FC/Supplier dashboard
- Platform admin pages

