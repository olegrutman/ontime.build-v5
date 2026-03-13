

# Fix: TC Seeing Supplier Invoices When GC Is Material-Responsible

## Bug
When **GC is material-responsible**, supplier invoices created from delivered POs are visible to the **TC** in their "From Field Crews & Suppliers" received tab. The TC should **not** see these invoices because the GC is the buyer/payer — the `pricing_owner_org_id` on the PO determines who receives the supplier invoice.

## Root Cause
Two issues in `src/components/invoices/InvoicesTab.tsx`:

1. **Visibility filter (lines 198-201)**: Only filters by `contract_id`. PO-linked invoices (`contract_id` is null, `po_id` set) pass through for everyone on the project.
2. **Categorization (lines 102-108)**: All PO-linked invoices are blindly categorized as "received from suppliers" for any non-supplier org — no check whether the current org is the actual buyer (`pricing_owner_org_id`) on that PO.

## Fix

### `src/components/invoices/InvoicesTab.tsx`

1. **Fetch PO buyer info**: After fetching invoices, for any PO-linked invoices, look up the `pricing_owner_org_id` from the `purchase_orders` table. This can be done by joining or by a separate query for PO-linked invoice `po_id`s.

2. **Filter visibility**: Only show PO-linked invoices to the org that matches `pricing_owner_org_id` (the buyer) or the supplier org. Build a map of `po_id → pricing_owner_org_id` and filter accordingly.

3. **Fix categorization**: In the sent/received bucketing logic (line 102-108), change the `else` branch to check if `currentOrgId === poOwnerMap[inv.po_id]` before putting it in `recSuppliers`. If the current org is not the pricing owner, exclude the invoice entirely.

### Approach
- When fetching invoices, also fetch `purchase_orders` for the PO-linked invoice `po_id`s to get `pricing_owner_org_id` and `supplier_org_id` (from the supplier relation).
- Store as a `Record<string, { pricingOwnerOrgId: string; supplierOrgId: string }>`.
- Use this map in both the visibility filter and the sent/received categorization.

### Single file change
| File | Change |
|---|---|
| `src/components/invoices/InvoicesTab.tsx` | Fetch PO ownership data; filter PO-linked invoices to only show for pricing_owner_org and supplier org |

