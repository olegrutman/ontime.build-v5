

# Add "Create Invoice" Option for Suppliers on Delivered POs

## Overview

After a supplier marks a PO as delivered, they should be able to generate an invoice for that PO to bill the buyer (GC or TC). This is a simpler flow than the existing "Bill to GC" (which adds markup for TCs) -- the supplier just invoices the PO total directly.

## Changes

### 1. New Component: `CreateSupplierInvoiceFromPO`

**File:** `src/components/purchase-orders/CreateSupplierInvoiceFromPO.tsx` (new)

A simplified invoice creation dialog for suppliers:
- Pre-fills line items from the PO (read-only, no markup)
- Shows PO subtotal + tax = total as the invoice amount
- Auto-generates invoice number using supplier org initials + sequential numbering
- Billing period defaults to current month
- Invoice number is editable
- No contract selection needed (contract_id = null)
- On submit: creates invoice row with `po_id` set, status = DRAFT, then creates invoice_line_items from PO line items

### 2. Add Button to PODetail

**File:** `src/components/purchase-orders/PODetail.tsx`

- Import the new `CreateSupplierInvoiceFromPO` component
- Add state: `supplierInvoiceOpen`
- After the "Mark Delivered" button block, add a new block for DELIVERED status + supplier role:
  - Show "Create Invoice" button (Receipt icon) when:
    - Status is DELIVERED
    - User is a supplier (`effectiveIsSupplier`)
    - PO is not already invoiced (`!alreadyInvoiced`)
  - Button opens the new dialog
- Render the dialog at the bottom of the component alongside the existing `CreateInvoiceFromPO` dialog

### 3. Update POCard to Show Invoiced Badge for Supplier POs

No changes needed -- the existing `isInvoiced` badge logic already covers this since the parent `PurchaseOrdersTab` fetches invoice linkage.

## Technical Details

### Invoice Creation SQL Flow

```text
1. INSERT into invoices:
   - project_id, po_id, invoice_number, billing period
   - subtotal = po_total (includes tax)
   - retainage_amount = 0 (no retainage for supplier invoices)
   - total_amount = po_total
   - created_by = current user
   - status = 'DRAFT'

2. INSERT into invoice_line_items:
   - One row per PO line item
   - description, scheduled_value = line_total, current_billed = line_total
   - Tax line item added separately if po_tax_total > 0

3. INSERT into project_activity:
   - Log the invoice creation event
```

### Button Placement in PODetail

```text
Current flow for DELIVERED POs:
  [Download]

After change:
  [Download]  [Create Invoice]  (if supplier + not yet invoiced)
```

## Files

| File | Action |
|------|--------|
| `src/components/purchase-orders/CreateSupplierInvoiceFromPO.tsx` | New -- simplified invoice dialog for suppliers |
| `src/components/purchase-orders/PODetail.tsx` | Add "Create Invoice" button for suppliers on DELIVERED POs |

