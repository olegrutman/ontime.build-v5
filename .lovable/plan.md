

# Show Supplier Invoices Correctly Across All Roles

## Summary

Three issues to fix in `InvoicesTab.tsx`:

1. **Supplier org sees no invoices** -- PO-based invoices are always classified as "received", but supplier orgs fall through to `sentInvoices` in `currentInvoices`. Need to classify PO-based invoices as "sent" when the current user is the supplier org.

2. **GC needs a tabbed view** -- GC currently has a single flat list. It should have tabs like TC does: "From Trade Contractors" (contract-based) and "From Suppliers" (PO-based), so they can distinguish invoice sources.

3. **TC "received" tab label** -- Currently says "From Field Crews" but should say "From Field Crews & Suppliers" since PO-based supplier invoices also appear there.

## Changes

### File: `src/components/invoices/InvoicesTab.tsx`

**1. Fix sent/received classification (lines 91-114)**

Update the PO-based invoice classification logic:
- If the current user is the supplier org linked to the PO, classify as "sent"
- If the current user is the GC/TC (buyer org on the PO), classify as "received"
- This requires fetching PO data to know `organization_id` (buyer) and `supplier.organization_id` (seller), or using the org type as a simpler heuristic: if `currentOrgType === 'SUPPLIER'`, PO-based invoices are "sent"; otherwise "received"

**2. Add GC tabbed view**

- Change the dual-view condition from `isTCWithDualView` to also include GC
- For GC: two tabs -- "From Trade Contractors" (contract-based received invoices) and "From Suppliers" (PO-based received invoices)
- Split `receivedInvoices` into `receivedFromContracts` and `receivedFromSuppliers` for GC display
- GC tabs use `Inbox` icon for both, with different labels

**3. Update TC "received" tab label**

- Change "From Field Crews" to "From Field Crews & Suppliers" on the tab trigger and header

**4. Update role context messaging**

- GC messaging per tab: "From TCs" tab shows TC-specific messaging, "From Suppliers" tab shows supplier-specific messaging
- Supplier org: Add messaging for sent invoices view

**5. Fix `currentInvoices` logic for supplier orgs**

- For `SUPPLIER` org type, return `sentInvoices` (which now correctly contains PO-based invoices)

### Technical Details

Key logic changes in the sent/received memo:

```text
for (const inv of invoices) {
  if (inv.contract_id) {
    // existing contract logic unchanged
  } else if (inv.po_id) {
    if (currentOrgType === 'SUPPLIER') {
      sent.push(inv);       // supplier sees their own PO invoices as "sent"
    } else {
      received.push(inv);   // GC/TC sees them as "received"
    }
  }
}
```

For GC, split received into sub-categories:

```text
receivedFromContracts = received invoices where contract_id is not null
receivedFromSuppliers = received invoices where contract_id is null and po_id is not null
```

GC rendering changes from single view to tabbed:

```text
Tabs:
  [From Trade Contractors] -- shows receivedFromContracts
  [From Suppliers]         -- shows receivedFromSuppliers
```

The `getInvoicePermissions` for supplier "sent" invoices: `canSubmit = true`, `canApprove = false` (supplier can submit their own drafts).

### Files Changed

| File | Action |
|------|--------|
| `src/components/invoices/InvoicesTab.tsx` | Update classification, add GC tabbed view, fix supplier visibility |

