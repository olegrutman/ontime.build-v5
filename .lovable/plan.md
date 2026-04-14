

# Fix Scope & Labor Header Using Wrong Totals

## What's Wrong

The screenshot shows the Scope & Labor header displaying **$350** for "Billable to GC" when the FC Pricing toggle is ON and the sidebar correctly shows **$650**. The header is using `totalLogged` (raw sum of all billable labor entries) instead of `financials.tcBillableToGC` (which includes the toggle-adjusted price).

The three header numbers are all wrong because they derive from `totalLogged`:
- "Billable to GC" shows $350 (raw TC labor) — should be $650 (toggle-adjusted price)
- "Internal Cost" shows $0 — this one depends on actual cost entries
- "Gross Margin" shows $350 (100%) — should be $650 - $350 = $300 (46.2%)

## Fix

**`src/components/change-orders/CODetailLayout.tsx`**

Replace `totalLogged` with the correct role-aware billable amount for the header calculations:

**Line 186** — Change the TC's displayed billable from raw labor sum to the financials hook value:
```typescript
const totalLogged = laborEntries.filter(e => !e.is_actual_cost).reduce((s, e) => s + (e.line_total ?? 0), 0);
const tcBillableDisplay = financials.tcBillableToGC + financials.materialsTotal + financials.equipmentTotal;
```

**Line 188** — Recompute gross margin using the correct billable for TC:
```typescript
const displayBillable = isTC ? financials.grandTotal : totalLogged;
const grossMargin = displayBillable - roleActualCost;
const grossMarginPct = displayBillable > 0 ? (grossMargin / displayBillable) * 100 : 0;
```

**Line 276** — Use `displayBillable` instead of `totalLogged` for TC:
```typescript
${ (isGC ? financials.grandTotal : displayBillable).toLocaleString(...) }
```

**Line 307** — Keep `totalLogged` for the progress bar "logged" text (that's raw hours value, correct as-is).

One file, three lines changed. The header will now match the sidebar financials exactly.

