

# Fix TC Overview Financial Logic

## Problem Summary

Three corrections needed for the Trade Contractor (TC) project overview:

1. **Live Position is incomplete** -- it only subtracts FC labor costs from WO revenue, but ignores material costs the TC is paying for on those work orders. The TC buys materials (via POs) and marks them up in the WO price to the GC, so the actual material spend must be deducted.

2. **Labor Budget tile should not show for TC** -- TC has contracts on both sides (GC above, FC below). The Labor Budget tile is designed for GC (who sets a labor target) and FC (who tracks earnings against it). TC manages profitability through the Live Position calculation, not a labor budget.

3. **Material Budget Control should default to the approved estimate total** -- When TC is material-responsible and no manual budget override is set, the material budget card should use the sum of approved supplier estimates as the baseline budget, not the WO material_total sum.

---

## Changes

### 1. Fix Live Position in `ContractHeroCard.tsx` (line 236-249)

Current formula:
```
woProfit = workOrderTotal - workOrderFCCost
livePosition = gcContractValue - fcContractValue + woProfit
```

Corrected formula -- subtract delivered/ordered material costs:
```
woProfit = workOrderTotal - workOrderFCCost - materialDelivered - materialOrderedPending
livePosition = gcContractValue - fcContractValue + woProfit
```

This requires passing `materialDelivered` and `materialOrderedPending` from financials into the Live Position calculation. These values represent the actual PO costs the TC is paying for materials.

### 2. Hide Labor Budget tile for TC in `BudgetTracking.tsx` (line 43)

Change:
```typescript
const showLabor = viewerRole === 'General Contractor' || viewerRole === 'Trade Contractor';
```
To:
```typescript
const showLabor = viewerRole === 'General Contractor' || viewerRole === 'Field Crew';
```

This removes the Labor Budget card from TC view. GC uses it to track labor spend targets, FC can use it to see earnings vs contract. TC manages margin through Live Position.

### 3. Material Budget defaults to estimate sum in `useProjectFinancials.ts`

The existing logic (lines 217-228 and 266-274) already has fallback logic, but it gets overwritten on line 274. The fix ensures that when TC is material-responsible and `material_estimate_total` is null on the contract, the `approvedEstimateSum` is used as the `materialEstimate` value.

Current line 274:
```typescript
setMaterialEstimate(materialContract ? (materialContract as any).material_estimate_total : matEstimate);
```

This sets materialEstimate to the contract's `material_estimate_total` (which may be null) or falls back to WO material_total sum (often stale/zero). Instead, the fallback chain should be:
1. Contract `material_estimate_total` (manual override) if set
2. `approvedEstimateSum` (sum of approved supplier estimates) if > 0
3. WO material_total sum as last resort

### Files Modified

1. **`src/components/project/ContractHeroCard.tsx`** -- Include material costs in Live Position calculation
2. **`src/components/project/BudgetTracking.tsx`** -- Hide labor budget for TC, show for GC and FC only
3. **`src/hooks/useProjectFinancials.ts`** -- Fix material estimate fallback priority

