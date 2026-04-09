

# Add Project Identifier to Invoice Numbers

## What Changes

Currently invoice numbers are formatted as `INV-{OrgInitials}-{OrgInitials}-0001` (SOV-based) or `INV-{OrgInitials}-0001` (PO-based). The project name needs to be included so invoices are identifiable across projects.

**New format**: `INV-{ProjectCode}-{FromOrg}-{ToOrg}-0001`

The project code will be derived from the project name (first 3 characters, uppercased, e.g. "Maple Heights" → "MAP").

## Technical Details

### 1. `src/components/invoices/CreateInvoiceFromSOV.tsx`
- In `generateInvoiceNumber`, fetch the project name from Supabase
- Add a `getProjectCode` helper: takes project name, returns first 3 chars uppercased (skipping "the")
- Update prefix from `INV-{from}-{to}` to `INV-{projectCode}-{from}-{to}`

### 2. `src/components/purchase-orders/CreateSupplierInvoiceFromPO.tsx`
- In the `useEffect` that generates the invoice number, fetch the project name
- Apply same `getProjectCode` helper
- Update prefix from `INV-{orgInitials}` to `INV-{projectCode}-{orgInitials}`

### 3. `src/components/demo/DemoInvoicesTab.tsx`
- Update the demo invoice number format to include a demo project code (e.g. `INV-DEM-DEMO-001`)

| File | Change |
|------|--------|
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Fetch project name, add project code to invoice number prefix |
| `src/components/purchase-orders/CreateSupplierInvoiceFromPO.tsx` | Fetch project name, add project code to invoice number prefix |
| `src/components/demo/DemoInvoicesTab.tsx` | Update demo invoice number format |

