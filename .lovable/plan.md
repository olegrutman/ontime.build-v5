

# Fix: TC Live Position Calculation

## Current Formula (Incorrect)
```
Live Position = GC Contract - FC Contract - Material Ordered
```

## New Formula (Per User Request)
```
Live Position = GC Contract - FC Contract + Work Order Profit
```

Where **Work Order Profit** = `workOrderTotal` (approved WO final prices) - `workOrderFCCost` (FC labor costs on those WOs).

## Changes

### File: `src/components/project/FinancialSignalBar.tsx` (line 247)

Update the live position calculation:

```typescript
// Before
const livePosition = gcContractValue - fcContractValue - materialOrdered;

// After
const woProfit = workOrderTotal - workOrderFCCost;
const livePosition = gcContractValue - fcContractValue + woProfit;
```

Update the subtext from `'In - Out - Materials'` to `'Contract margin + WO profit'` to reflect the new formula.

No other files need changes -- `workOrderTotal` and `workOrderFCCost` are already fetched and returned by `useProjectFinancials`.

