

# Fix: "Invoices Paid" and "Pending Review" KPI calculations

## Problems

From the screenshot, the dashboard shows:
- **Invoices Paid: $40,249** — but only $21,249 (INV-IM-HA-0001) + $13,813 (INV-PA-IM-0001) = $35,062 are actually PAID. The $19,000 SUBMITTED invoice is incorrectly included.
- **Pending Review: $0** — PO-linked invoices with status SUBMITTED are excluded because the filter requires `i.contract_id` to exist (`!i.contract_id` returns true and skips them).

### Root causes

1. **"Invoices Paid" (`totalBilled`)**: The TC calculation at line 568 filters out only `DRAFT` status, so SUBMITTED, APPROVED, and REJECTED invoices are all counted. It should only count `PAID` invoices.

2. **"Pending Review" (`outstandingToPay`)**: Line 504 requires `!i.contract_id` — this skips PO-linked invoices that have no contract. PO invoices submitted to the TC's org should also appear as pending review.

## Changes

### `src/hooks/useDashboardData.ts`

1. **Fix `totalBilled` for all roles (TC/GC/FC)**: Change the filter from `i.status === 'DRAFT'` to `i.status !== 'PAID'` so only PAID invoices are summed for "Invoices Paid".

2. **Fix `invoicesToPay`**: Include PO-linked invoices where the current org is the pricing owner (`pricing_owner_org_id === currentOrg.id`) and status is SUBMITTED.

3. **Fix `invoicesToCollect`**: Similarly include PO-linked invoices where the current org is the supplier.

### `src/components/dashboard/DashboardKPIRow.tsx`

No changes needed — it correctly displays whatever values it receives.

