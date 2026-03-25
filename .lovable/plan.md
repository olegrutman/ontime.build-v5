

# Fix: Budget Overview "Pending" shows wrong metric

## Problem
The Budget Overview sidebar's "Pending" row uses `billing.outstandingToPay` -- invoices the TC needs to pay to subs/suppliers. In a budget consumption context, "Pending" should show invoices the TC has submitted to the GC that are awaiting payment (i.e., `outstandingToCollect`).

Currently for this TC user:
- **Paid**: $21,249 (paidToYou from GC) -- correct
- **Pending**: $13,812.50 (outstandingToPay to FC) -- wrong; should be $19,000.20 (submitted to GC, awaiting payment)
- **Remaining**: derived from the above -- also wrong as a result

## Root Cause
`DashboardBudgetCard` takes `billing.outstandingToPay` for the "Pending" row, but this represents payables (what you owe), not receivables awaiting payment. The correct value depends on role:
- **TC/FC**: Pending = `outstandingToCollect` (invoices submitted upstream, awaiting payment)
- **GC**: Pending = `outstandingToPay` (invoices from subs awaiting your approval/payment)

## Fix

### `src/components/dashboard/DashboardBudgetCard.tsx`
- Change the `billing` prop from `outstandingToPay` to `pendingAmount` (a pre-computed role-aware value)

### `src/pages/Dashboard.tsx`
- Compute the correct pending value based on org type:
  - TC/FC: pass `billing.outstandingToCollect`
  - GC: pass `billing.outstandingToPay`
- Pass it as `billing.pendingAmount` to the Budget card

### Technical detail
In `Dashboard.tsx`, before rendering:
```typescript
const budgetPending = orgType === 'GC' 
  ? billing.outstandingToPay 
  : billing.outstandingToCollect;
```
Pass `{ pendingAmount: budgetPending }` to `DashboardBudgetCard`.

