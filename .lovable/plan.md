

# Update Platform KPI Configuration Defaults

## Problem

The default KPI card configurations in `src/constants/defaultKpiConfig.ts` are outdated. The actual dashboards now use a rich expandable KPI card system with 6-8 cards per role, but the defaults still show the old 3-4 simple cards (e.g. "Contract Value", "Paid Out", "Received", "Projected Margin" for GC). The Platform KPI Cards page at `/platform/kpis` shows these stale defaults.

## What's Changing

Update `defaultKpiConfig.ts` to match the actual KPI cards rendered in each dashboard view.

### New Defaults Per Role

**General Contractor (8 cards):**
1. Total Owner Budget — Full portfolio value
2. GC Profit Margin — Owner budget minus TC contracts
3. Change Orders — Pending review count
4. Materials (GC POs) — Purchase order spend
5. Needs Attention — Items requiring response
6. Total Paid — Outgoing payments to subs
7. Pending GC Approval — Invoices awaiting review
8. TC Contracts Committed — Total TC contract value

**Trade Contractor (8 cards):**
1. GC Contracts (Revenue) — Revenue from GC contracts
2. FC / Labor Contracts (Cost) — Field crew costs
3. Gross Margin — Revenue minus costs
4. Change Orders — Pending review count
5. Received from GC — Payments collected
6. Pending from GC — Invoices awaiting GC approval
7. Materials (TC POs) — Purchase order spend
8. Needs Attention — Items requiring response

**Field Contractor (6 cards):**
1. Contract with TC — Active contract value
2. Net Margin — Profit on contract + COs
3. CO Additions — Approved change order value
4. Paid by TC — Payments received
5. Pending from TC — Invoices awaiting approval
6. Work Progress — Completion percentage

**Supplier (6 cards):**
1. Total Estimate Value — Across active projects
2. Total Ordered — Percentage of estimate
3. Extra / Over-Ordered — Projects over estimate
4. Total Billed — Invoiced amount
5. Total Received — Payments collected
6. Outstanding Balance — Remaining receivable

## Files Changed

| File | Change |
|------|--------|
| `src/constants/defaultKpiConfig.ts` | Replace all 4 default arrays with the new card lists matching actual dashboards |

### What is NOT changing
- `PlatformKPIs.tsx` page (reads from same config, no structural change)
- Dashboard view components (already render the correct cards)
- Database or RLS

