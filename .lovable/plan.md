## Fixes to financial formulas

### 1. Margin to Date → cash basis (received − paid)
In `src/hooks/useProjectFinancials.ts` (~line 552-584), replace the role-aware accrual computation with a single cash-basis formula for all roles:

- `earnedRevenueToDate = receivablesCollected` (sum of PAID receivable invoices)
- `incurredCostToDate  = payablesPaid` (sum of PAID payable invoices)
- `marginToDateAmount  = receivablesCollected − payablesPaid`
- `marginToDatePct     = receivablesCollected > 0 ? marginToDateAmount / receivablesCollected * 100 : 0`

Remove the `openMaterialCommitment`, `approvedCORevenue/Cost`, `gcPayablesInvoiced`, `ownerBillingsTotal` branches from the margin-to-date calc (still used elsewhere). Update the tile subtitle/breakdown on `TCProjectOverview.tsx` (line ~509-520) so the expanded rows show: Received from GC, Paid to FC, Net (cash). Apply the same simplification on GC and FC overview cards where Margin to Date is shown.

### 2. Pending = everything not paid
For each "Pending from X" / "Pending to X" tile, swap the SUBMITTED-only sum for `total − paid`:

- TC `TCProjectOverview.tsx` (~line 296-302):
  - `totalPendingFromGC = revisedGCTotal − receivablesCollected` (or `receivablesInvoiced + draft − collected`; we use contract-minus-collected so drafts and un-billed remainder both count as "not paid")
  - `fcPendingAmount   = revisedFCTotal − payablesPaid`
- Apply same swap on GC (`GCProjectOverviewContent.tsx`) and FC (`FCProjectOverview.tsx`) "Pending" tiles.
- Keep "warnings" banner trigger using SUBMITTED-awaiting-approval count so the chase-action UX still fires on submitted-only invoices.

### 3. CO Net Margin includes pending COs
In `TCProjectOverview.tsx` (~line 264-268):

```ts
const countedCOs = changeOrders.filter(co => co.status !== 'rejected');
const coRevenue   = countedCOs.reduce((s, co) => s + (co.gc_budget || 0), 0);
const coCost      = countedCOs.reduce((s, co) => s + (co.tc_submitted_price || 0), 0);
const coNetMargin = coRevenue - coCost;
```

Update the CO Net Margin tile label/sub to "X COs (incl. pending)" and the count to `countedCOs.length`. Keep `approvedCOs` available for any place that explicitly needs the approved-only subset (revenue rollup into revised contract should still use approved only — only the Net CO tile changes).

### Files touched
- `src/hooks/useProjectFinancials.ts` — margin-to-date formula
- `src/components/project/TCProjectOverview.tsx` — pending, Net CO, margin breakdown rows
- `src/components/project/GCProjectOverviewContent.tsx` — pending tile, margin breakdown rows
- `src/components/project/FCProjectOverview.tsx` — pending tile, margin breakdown rows

### Out of scope
Dashboard portfolio rollups, invoices page logic, schema/triggers, contract math. Memory note `mem://features/financials/realized-margin-to-date` will be updated to reflect the cash-basis simplification once implemented.
