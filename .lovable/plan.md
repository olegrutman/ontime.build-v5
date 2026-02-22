

# Hide Non-Submitted POs from Supplier View

## Problem
Suppliers currently see all POs assigned to them, including those in `ACTIVE` (draft) status that haven't been submitted yet. Suppliers should only see POs that have been submitted to them (status `SUBMITTED` or later).

## Changes

### 1. `src/components/project/PurchaseOrdersTab.tsx`
In the `fetchPurchaseOrders` function, after the supplier ID filter (line ~91), add a status filter to exclude `ACTIVE` POs for supplier users:
```typescript
query = query.neq('status', 'ACTIVE');
```

### 2. `src/components/project/SupplierPOSummaryCard.tsx`
Update the query that fetches PO status counts to exclude `ACTIVE` POs -- suppliers should not see draft counts.

### 3. `src/components/project/SupplierContractsSection.tsx`
Already filters to `FINALIZED` and `DELIVERED` only -- no change needed.

### 4. `src/components/project/POSummaryCard.tsx`
When the viewer is a supplier, filter out `ACTIVE` POs from the counts and totals.

## Technical Detail
- The `ACTIVE` status means the PO is still being drafted by the GC/TC and has not been sent to the supplier
- `SUBMITTED` is the first status where the supplier should see the PO
- This is a frontend filter only -- RLS already controls row access, but the business logic of "don't show drafts to suppliers" is enforced in the UI queries

