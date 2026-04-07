
# Build TC Project Overview Page

## Overview

Create `src/components/project/TCProjectOverview.tsx` — a dedicated project overview for Trade Contractors. Modify `ProjectHome.tsx` to render it when the current org type is `TC`.

The component follows the exact same visual architecture as `GCProjectOverviewContent` and `FCProjectOverview` (same design tokens, `KpiCard`, `Pill`, `THead`, `TRow`, `WarnItem`, `EditField` helpers).

## Data Sources

All from the existing `financials: ProjectFinancials` prop:
- **GC Contract (upstream)**: `financials.upstreamContract` — read-only
- **FC Contract (downstream)**: `financials.downstreamContract` — editable via `financials.updateContract()`
- **Invoices**: `financials.recentInvoices`, `financials.totalPaid`, `financials.billedToDate`, `financials.receivables*`, `financials.payables*`
- **Change Orders**: queried via `supabase.from('change_orders')` scoped to project
- **RFIs**: queried via `supabase.from('project_rfis')` scoped to project

## 8 KPI Cards (4-col grid)

1. **GC Contract** (amber, read-only) — `upstreamContract.contract_sum`. Expand: contract value, approved COs billed to GC, revised total, received/pending/remaining. Info callout: "Set by your GC."
2. **FC Contract** (green, EDITABLE) — `downstreamContract.contract_sum`. Expand: Section 1 with `EditField` rows (FC name, value, type, scope). Save via `financials.updateContract()`. Section 2: margin breakdown table (GC contract - FC contract = margin, plus CO impact).
3. **TC Gross Margin** (green) — GC contract minus FC contract. Expand: same margin table.
4. **CO Net Margin** (blue) — CO revenue (gc_budget) minus CO cost (tc_submitted_price). Expand: per-CO table with billed-to-GC vs paid-to-FC columns.
5. **Received from GC** (green) — `financials.receivablesCollected`. Expand: paid invoice table.
6. **Pending from GC** (yellow) — submitted invoices sum. Expand: pending invoice detail.
7. **Paid to FC** (navy) — `financials.payablesPaid`. Expand: paid FC invoice table.
8. **FC Invoice Pending** (red) — pending FC invoices awaiting TC approval. Expand: invoice detail with approve/reject buttons (stub actions).

## Below the Cards

### Cash Flow Ladder (full-width)
Three-column CSS flex layout showing GC → TC (you) → FC money flow with margin callout boxes. Pure CSS, no chart library.

### Warnings Section
Dynamic warnings from data: pending GC invoices, FC invoices awaiting approval, open RFIs, pending COs.

## Files Changed

| File | Change |
|------|--------|
| `src/components/project/TCProjectOverview.tsx` | **New** — Full TC project overview |
| `src/pages/ProjectHome.tsx` | Add `isTC` check, import and render `TCProjectOverview` between FC and GC conditions |
