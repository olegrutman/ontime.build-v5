

# Fix: Add Payables Retainage to TC Net Cash Position

## Problem
The payables section is missing **retainage tracking**. The FC→TC invoice has retainage ($682.56) that the TC withholds — this cash is technically held by the TC but owed later. Without tracking it:
1. The payables "Outstanding" line is wrong (doesn't subtract retainage held back)
2. The Net Cash Position doesn't reflect the full picture

## Real-Life Logic
A TC collects from GC (minus retainage held by GC) and pays FC/suppliers (minus retainage the TC holds from FC). The true net cash position is:

```
Net Cash = (Collected from GC) − (Paid to FC & Suppliers) + (Retainage TC holds from FC)
```

The retainage TC holds from FC is cash the TC still has in pocket (owed later but available now).

## Changes

### 1. `src/hooks/useProjectFinancials.ts`
- Add `payablesRetainage` state field and compute it from payable invoices' `retainage_amount`
- Export it in the interface and return object

### 2. `src/components/project/BillingCashCard.tsx`
- Add "Retainage Held" row in the Payables section (like receivables already has)
- Update payables Outstanding: `payablesInvoiced - payablesPaid - payablesRetainage`
- Update Net Cash formula: `(receivablesCollected) - (payablesPaid) + (payablesRetainage held from FC)`
  - Retainage TC holds from FC is money the TC physically has
  - Retainage GC holds from TC is money the TC doesn't have (already excluded from `receivablesCollected`)

**2 files, ~10 lines changed. No database changes.**

