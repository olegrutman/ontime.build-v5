

# Fix: Deduct Material Estimate Cost from TC Live Position & Labor Margin

## Problem

When TC is material-responsible, the **Labor Margin** in the Profit Card doesn't deduct any material costs — it only shows `Revenue - FC Cost`. The **Live Position** in the Contract Hero Card deducts actual PO costs (delivered + pending), but should use the full estimate budget to reflect the true material obligation.

## Changes

### 1. `src/components/project/ProfitCard.tsx` — TC Labor Margin (line 142)

Currently:
```
const laborMargin = revenueTotal - fcContractValue - workOrderFCCost;
```

When `isTCMaterialResponsible`, deduct the material estimate (approved estimate total) from the margin:
```
const estimateCost = isTCMaterialResponsible ? (materialEstimate || approvedEstimateSum || 0) : 0;
const laborMargin = revenueTotal - fcContractValue - workOrderFCCost - estimateCost;
```

This requires destructuring `materialEstimate` and `approvedEstimateSum` from `financials` (they already exist on the hook).

Also add a "Material Budget" line item in the non-material-responsible TC block (currently hidden) and show it in the material-responsible block too, so the user can see what's being deducted.

### 2. `src/components/project/ContractHeroCard.tsx` — Live Position (line 238)

Currently:
```
const materialCosts = isTCMaterialResponsible ? (materialDelivered + materialOrderedPending) : 0;
```

Change to use the estimate budget as the material cost obligation:
```
const materialCosts = isTCMaterialResponsible ? (materialEstimate || approvedEstimateSum || 0) : 0;
```

This requires destructuring `materialEstimate` and `approvedEstimateSum` from `financials` in the component props (line 34-40).

### Summary

Both places will use the same source: the approved estimate total (material budget) as the cost of materials when TC is responsible, giving a consistent "what materials will cost us" deduction across Live Position and Profit cards.

