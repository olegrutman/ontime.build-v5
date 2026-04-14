

# T&M Project Overview: Role-Specific KPI Cards for GC and FC

## Problem
The TC overview already adapts well for T&M/Remodel projects (WO-driven labels, revenue from approved WOs, cost tracking). But GC and FC overviews still show fixed-contract concepts (Owner Budget, fixed contracts, SOV-based billing) even when `isTM` is true. In T&M projects, all numbers flow from Work Orders — there are no fixed contracts or SOV baselines.

## What Changes

### GC Overview (`GCProjectOverviewContent.tsx`)

When `isTM` is true, replace the 8 fixed-contract KPI cards with WO-driven cards:

| Card | Label | Value Source | Expanded Detail |
|------|-------|-------------|-----------------|
| 1 | **WO REVENUE (BILLED TO OWNER)** | Sum of approved WO `gc_budget` | WO table with # / title / gc_budget / status |
| 2 | **TC COST (WO LABOR + MARKUP)** | Sum of approved WO `tc_submitted_price` | WO table showing TC submitted prices |
| 3 | **YOUR MARGIN** | WO Revenue − TC Cost | Breakdown: revenue, cost, margin %, per-WO net |
| 4 | **WORK ORDERS** | Count + pending/approved | WO list with status pills, "Create WO" button |
| 5 | **MATERIALS** | Keep existing materials card (unchanged) | Same PO tracking |
| 6 | **RFIs** | Keep existing (unchanged) | Same |
| 7 | **INVOICES** | Keep existing (unchanged) | Same |
| 8 | **TEAM** | Keep existing (unchanged) | Same |

Key differences from fixed-contract mode:
- No "Owner Budget" editable card (T&M has no fixed budget — revenue = sum of approved WOs)
- No "TC Contract" editable card (no fixed contract — cost = sum of WO submitted prices)
- Margin is purely WO-driven: `Σ gc_budget - Σ tc_submitted_price`
- Header buttons change: "Create Work Order" instead of "Create Change Order"

### FC Overview (`FCProjectOverview.tsx`)

When `isTM` is true, replace the 6 fixed-contract KPI cards with WO-driven cards:

| Card | Label | Value Source | Expanded Detail |
|------|-------|-------------|-----------------|
| 1 | **MY WO EARNINGS** | Sum of approved WO `tc_submitted_price` (FC's share) | WO table with FC pricing |
| 2 | **WORK PROGRESS** | % of WOs completed vs total | Progress bar, WO completion status |
| 3 | **WORK ORDERS** | Count + status breakdown | WO list with status pills |
| 4 | **PAID BY TC** | Keep existing paid card (same logic, WO-sourced invoices) | Invoice table |
| 5 | **PENDING FROM TC** | Keep existing pending card | Pending invoices |
| 6 | **HOURS LOGGED** | Sum of FC labor hours from WO entries | Hours breakdown by WO |

Key differences from fixed-contract mode:
- No "My Contract" card (no fixed contract — earnings = sum of WO values assigned to FC)
- No "Net Margin" card (FC doesn't set internal budget in T&M — they log hours per WO)
- "Hours Logged" card replaces the fixed "Work Progress" with WO-driven time tracking

### Implementation Details

**GCProjectOverviewContent.tsx** (~100 lines changed):
- Add `if (isTM)` branch after the header, before `<KpiGrid>`
- Compute WO-driven values: `woRevenue = Σ approved gc_budget`, `woCost = Σ approved tc_submitted_price`, `woMargin = woRevenue - woCost`
- Render 8 T&M-specific KPI cards using existing `KpiCard` components
- Swap header buttons: "Create Work Order" / "View Work Orders" instead of CO equivalents
- Cards 5-8 (Materials, RFIs, Invoices, Team) reuse existing card markup — only cards 1-4 change
- The existing `changeOrders` query already fetches all COs/WOs, just relabel

**FCProjectOverview.tsx** (~80 lines changed):
- Add `if (isTM)` branch
- FC WO earnings from `changeOrders` query (already exists, filtered by `currentOrgId`)
- Replace "My Contract" with "My WO Earnings" (sum of `tc_submitted_price` from approved WOs)
- Replace "Net Margin" with "Hours Logged" — query `change_order_labor_entries` for FC org's entries
- Add a new query for FC labor hours: `supabase.from('change_order_labor_entries').select('hours, hourly_rate').eq('org_id', currentOrgId)` scoped to project WOs
- Cards 4-5 (Paid/Pending from TC) stay the same

**No database changes needed** — all data already exists in `change_orders` and `change_order_labor_entries` tables.

**Supplier overview is excluded** — supplier KPIs don't change for T&M (they track POs/estimates regardless of project type).

### Data Flow Summary
```text
T&M Data Flow:
  WO (change_orders) → gc_budget (what GC bills owner)
                      → tc_submitted_price (what TC bills GC)
                      → change_order_labor_entries (FC hours)

  GC sees: Revenue (gc_budget) vs Cost (tc_submitted_price) = Margin
  TC sees: Revenue (gc_budget from GC) vs Cost (FC contract/hours) = Margin  [already done]
  FC sees: Earnings (tc_submitted_price or FC hours × rate) vs Paid
```

Two files modified: `GCProjectOverviewContent.tsx`, `FCProjectOverview.tsx`. TC and Supplier remain unchanged.

