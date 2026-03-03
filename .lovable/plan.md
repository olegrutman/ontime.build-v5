

# Fix: TC Live Position Incorrectly Deducts GC-Responsible Material Costs

## Problem
The TC "Live Position" formula in `ContractHeroCard` (line 238) unconditionally deducts `materialDelivered` and `materialOrderedPending` from the TC's profitability:

```
woProfit = workOrderTotal - workOrderFCCost - materialDelivered - materialOrderedPending
livePosition = gcContractValue - fcContractValue + woProfit
```

But `materialDelivered` and `materialOrderedPending` are computed from **all** project POs (line 333-337 in `useProjectFinancials.ts`) with no filter on who is responsible for materials. In the current test project, `material_responsibility = 'GC'`, meaning the GC pays for materials — yet the TC's Live Position still deducts $22K+ in PO costs that the TC never pays for.

The `ProfitCard` component correctly checks `isTCMaterialResponsible` before including material costs. The `ContractHeroCard` does not.

## Formula Audit

| Role | Metric | Formula | Correct? |
|------|--------|---------|----------|
| GC | Profit | Owner Contract − Current Total | Yes |
| GC | Current Total | GC Contract + Approved WOs | Yes |
| GC | Billing | Invoiced / Paid / Outstanding | Yes |
| FC | Profit | Contract Total + WOs − Labor Budget | Yes |
| TC | Profit (ProfitCard) | Labor Margin + Material Margin (only if TC responsible) | Yes |
| TC | **Live Position** | GC Contract − FC Contract + WOs − FC Cost − **ALL materials** | **BUG** |
| TC | Billing | Split receivables/payables | Yes |

## Changes

### `src/components/project/ContractHeroCard.tsx` (line 237-250)
Pass `isTCMaterialResponsible` from financials. Only deduct `materialDelivered` and `materialOrderedPending` when `isTCMaterialResponsible === true`. When GC is responsible, the TC's Live Position should be:

```
livePosition = gcContractValue - fcContractValue + workOrderTotal - workOrderFCCost
```

When TC is responsible:
```
livePosition = gcContractValue - fcContractValue + workOrderTotal - workOrderFCCost - materialDelivered - materialOrderedPending
```

Concrete change: Add `isTCMaterialResponsible` to the destructured props (line 34-40), then update the formula (line 238-239) to conditionally include material costs.

**1 file, ~4 lines changed. No database changes.**

