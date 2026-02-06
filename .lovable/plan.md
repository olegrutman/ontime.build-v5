

# Fix: Pricing Owner (TC) Cannot Finalize POs Created by Another Org (GC)

## Root Cause

The current UPDATE policies on `purchase_orders` all require `organization_id = get_user_org_id(auth.uid())`, meaning only the **creating** organization can update the PO. When a GC creates a PO but material responsibility is assigned to the TC, the TC becomes the `pricing_owner_org_id` and the UI correctly shows them the "Finalize Order" button. However, the database silently rejects the update because the TC's org does not match the PO's `organization_id` (which is the GC's org).

### Current UPDATE Policies on `purchase_orders`

| Policy | Who | Condition |
|--------|-----|-----------|
| PM roles can update active POs | Any PM in creator org | status = ACTIVE, org matches creator |
| GC_PM can update any PO | GC_PM in creator org | org matches creator |
| Supplier can mark PO as priced | Supplier org | SUBMITTED to PRICED |
| Supplier can mark PO as ordered | Supplier org | PRICED to ORDERED |
| Supplier can mark PO as delivered | Supplier org | ORDERED to DELIVERED |

None of these allow a **pricing owner from a different org** to update the PO status. The finalize action (PRICED to FINALIZED) is completely blocked for cross-org pricing owners.

## Fix

### Database Migration: Add Pricing Owner Finalize Policy

Add a new UPDATE policy that allows the pricing owner organization to transition a PO from PRICED to FINALIZED, regardless of who created the PO.

```text
CREATE POLICY "Pricing owner can finalize PO"
ON purchase_orders FOR UPDATE TO public
USING (
  is_pm_role(auth.uid())
  AND user_in_org(auth.uid(), pricing_owner_org_id)
  AND status = 'PRICED'
)
WITH CHECK (
  is_pm_role(auth.uid())
  AND user_in_org(auth.uid(), pricing_owner_org_id)
  AND status IN ('PRICED', 'FINALIZED')
);
```

This policy:
- Requires the user to be a PM role (GC_PM or TC_PM)
- Checks the user belongs to the `pricing_owner_org_id` (not the creator org)
- Only allows updates when current status is PRICED
- Only allows transition to FINALIZED (or staying at PRICED)

### No Frontend Changes Needed

The UI logic in `PODetail.tsx` and `usePOPricingVisibility.ts` is already correct:
- `canFinalize` is computed as `isPricingOwner && po.status === 'PRICED'`
- The "Finalize Order" button is shown and calls `updatePOStatus('FINALIZED')`
- The only blocker was the RLS policy rejecting the update at the database level

## Summary

| Item | Detail |
|------|--------|
| Root cause | No UPDATE policy allows cross-org pricing owner to finalize |
| Fix | One new RLS policy on `purchase_orders` for pricing owner finalization |
| Files changed | 1 new migration file only |
| Risk | Low -- additive policy, does not modify existing policies |

