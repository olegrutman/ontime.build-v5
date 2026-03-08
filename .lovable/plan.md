

# Math Formula Audit — 7 Bug Fixes — COMPLETED

## Bugs Fixed

### Bug 1: WorkOrderSummaryCard — TC profit now only sums approved/contracted WOs
Revenue filter added so drafts and rejected WOs are excluded from `tcToGcTotal`.

### Bug 2: WorkOrderSummaryCard — TC profit includes tc_internal_cost
`profit = revenue - fcCost - tcInternalCostTotal` for accurate self-performing margin.

### Bug 3: useDashboardData — TC dashboard profit includes internal cost
`tc_internal_cost` summed from WO query and added to `totalCosts`.

### Bug 4: useProjectFinancials — Equipment total fetched directly
`equipment_total` selected from DB and summed directly instead of derived from mismatched sources.

### Bug 5: ContractedPricingCard — Revenue uses recalculated totals
`revenue = laborTotal + materialTotal + equipmentTotal` instead of stale `final_price`.

### Bug 6: ProfitCard — TC labor margin includes tcInternalCostTotal
`laborMargin = revenueTotal - fcContractValue - workOrderFCCost - tcInternalCostTotal - estimateCost`.

### Bug 7: useDashboardData — WO revenue includes both approved and contracted
Removed `.filter(wo => wo.status === 'contracted')` so both statuses count.

## Files Changed
- `src/components/project/WorkOrderSummaryCard.tsx` — Bugs 1, 2
- `src/hooks/useDashboardData.ts` — Bugs 3, 7
- `src/hooks/useProjectFinancials.ts` — Bugs 4, 6
- `src/components/change-order-detail/ContractedPricingCard.tsx` — Bug 5
- `src/components/project/ProfitCard.tsx` — Bug 6
