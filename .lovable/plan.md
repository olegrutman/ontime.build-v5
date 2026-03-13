

# Fix: TC Billing & Cash Card Incorrectly Includes GC-Responsible Supplier Invoices

## Bug
The `useProjectFinancials` hook (line 316) includes **all** PO-linked invoices as TC payables via `inv.po_id != null`, without verifying that the TC is the `pricing_owner_org_id` on the PO. When material responsibility is GC, this inflates TC payables by the supplier invoice amount and produces a wrong net position.

## Fix

### `src/hooks/useProjectFinancials.ts` (lines ~300-325)
- Before classifying PO-linked invoices as TC payables, fetch the `pricing_owner_org_id` from the `purchase_orders` table for all PO-linked submitted invoices.
- Only include a PO-linked invoice in TC payables if `pricing_owner_org_id` matches one of the TC's `orgIds`.

```
// After line ~312, before filtering payableInvs:
// Fetch PO ownership for PO-linked invoices
const poLinkedInvs = submitted.filter(inv => inv.po_id);
const poIds = [...new Set(poLinkedInvs.map(inv => inv.po_id))];
// Query purchase_orders for pricing_owner_org_id
const { data: poOwners } = await supabase
  .from('purchase_orders')
  .select('id, pricing_owner_org_id')
  .in('id', poIds);
const poOwnerMap = new Map((poOwners || []).map(po => [po.id, po.pricing_owner_org_id]));

// Then update line 316:
const payableInvs = submitted.filter(inv =>
  (inv.contract_id && downstreamContractIds.has(inv.contract_id)) ||
  (inv.po_id && poOwnerMap.get(inv.po_id) && orgIds.includes(poOwnerMap.get(inv.po_id)!))
);
```

Single file change. Same pattern as the InvoicesTab fix.

| File | Change |
|---|---|
| `src/hooks/useProjectFinancials.ts` | Filter PO-linked invoices by `pricing_owner_org_id` before including in TC payables |

