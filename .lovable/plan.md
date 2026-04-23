

## Plan — Fix invoice number missing project code

### The bug
In the invoice list you see two invoices:
- `INV-FUL-IM-HA-0001` ✅ (correct — has `FUL` for Fuller Residence)
- `INV-IM-HA-0001` ❌ (missing the `FUL` project code)

Both should follow the standard convention: `INV-{ProjectCode}-{FromInitials}-{ToInitials}-{####}`.

### Root cause
`src/components/purchase-orders/CreateInvoiceFromPO.tsx` (line 178) generates the prefix as:

```ts
const prefix = `INV-${fromInitials}-${toInitials}`;
```

It skips the project code. Every other invoice-creation path (`CreateInvoiceFromSOV.tsx`, `CreateSupplierInvoiceFromPO.tsx`) correctly inserts `getProjectCode(project.name)` between `INV-` and the org initials.

### Fix

1. **Edit `src/components/purchase-orders/CreateInvoiceFromPO.tsx`**
   - Add the same `getProjectCode(name)` helper used in the sibling files (3-letter cleaned project code).
   - Inside the `generate()` effect, fetch the project name (`projects.name` by `projectId`) the same way `CreateInvoiceFromSOV.tsx` does.
   - Build the prefix as `INV-${projectCode}-${fromInitials}-${toInitials}` so it matches the convention.
   - The numeric counter logic stays the same (it scans existing invoices with that prefix and increments).

2. **Backfill the one bad invoice (optional, recommended)**
   - The existing record `INV-IM-HA-0001` for the Fuller project will be renamed to `INV-FUL-IM-HA-0001` via a one-line UPDATE so the list looks consistent. Since `INV-FUL-IM-HA-0001` already exists from an earlier creation, we'll rename the new one to `INV-FUL-IM-HA-0002` to avoid a unique-conflict.

### Files
- **Edit**: `src/components/purchase-orders/CreateInvoiceFromPO.tsx` (add `getProjectCode`, fetch project name, fix prefix)
- **Migration**: one `UPDATE invoices SET invoice_number = 'INV-FUL-IM-HA-0002' WHERE id = 'cf03ca8d-29c7-4f8e-bfba-637a471fcd78';`

### Verification
- Create a new invoice from a PO → number is `INV-FUL-IM-HA-000X` (with project code).
- Existing `INV-IM-HA-0001` row becomes `INV-FUL-IM-HA-0002`.
- Other invoice flows (SOV, supplier-from-PO) unaffected.

