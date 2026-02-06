

# TC Material PO-to-Invoice Feature

## Business Context

When a Trade Contractor (TC) is responsible for materials (`material_responsibility = 'TC'` on the contract), the TC orders materials via a Purchase Order, the supplier prices them, and the TC pays the supplier. The TC then needs to bill the General Contractor (GC) for those materials -- potentially with a markup.

**Today, there is no way for the TC to convert a priced PO into an invoice for the GC.** The TC would have to manually create an invoice from the SOV, which doesn't tie back to the actual PO data. This feature bridges that gap.

## How It Will Work (User Flow)

1. TC creates a PO and sends it to a supplier
2. Supplier prices the PO (status becomes PRICED or FINALIZED)
3. TC opens the PO Detail page and sees a new **"Bill to GC"** button
4. TC clicks the button and a dialog opens showing:
   - PO line items (descriptions, quantities, priced totals)
   - Subtotal from the supplier
   - A markup section (percent or flat amount) -- pre-filled from Change Order markup if linked
   - The total amount that will be invoiced to the GC
   - Billing period dates (auto-filled to current month)
   - Auto-generated invoice number (using the existing prefix format)
5. TC reviews and confirms
6. System creates a DRAFT invoice linked to the TC-to-GC contract, with line items derived from PO items
7. The invoice appears in the Invoices tab under "Sent to GC" with `po_id` set for traceability
8. TC can review and submit the invoice to the GC through the normal invoice workflow

## What Gets Built

### 1. New Component: `src/components/purchase-orders/CreateInvoiceFromPO.tsx`

A dialog component that converts a priced PO into a draft invoice for the GC. Contains:

- **PO Summary**: Shows PO number, supplier, line item count, and supplier subtotal (read-only)
- **Markup Section**: Lets TC add a percentage or flat-dollar markup on top of the supplier cost. Pre-populates from the linked Change Order's `material_markup_type/percent/amount` if available
- **Total Preview**: Shows Supplier Cost + Markup = Invoice Total in real-time
- **Billing Period**: Date pickers (defaults to current month)
- **Invoice Number**: Auto-generated using the `INV-[FROM]-[TO]-[SEQ]` pattern
- **Contract Selection**: Auto-selects the TC-to-GC contract. If multiple exist, shows a dropdown

On submit:
- Creates an `invoices` record with `contract_id` (TC-to-GC), `sov_id` (null for PO-based invoices), `po_id` (the PO being invoiced), status = DRAFT
- Creates `invoice_line_items` from PO line items, mapping description/quantity/totals
- Shows success toast and redirects to the new invoice

### 2. Modify: `src/components/purchase-orders/PODetail.tsx`

Add a **"Bill to GC"** button in the action buttons area. This button is visible only when:
- The current user is a TC (`currentRole === 'TC_PM'`)
- The PO has pricing data (status is PRICED, FINALIZED, ORDERED, READY_FOR_DELIVERY, or DELIVERED)
- The TC is the `pricing_owner_org_id` on the PO (meaning TC is material-responsible)
- A TC-to-GC contract exists for this project

The button opens the `CreateInvoiceFromPO` dialog.

### 3. Modify: `src/components/purchase-orders/POCard.tsx`

Add a subtle "Invoiced" badge on PO cards when a linked invoice already exists (`po_id` match in invoices table). This gives at-a-glance visibility that a PO has been billed.

### 4. Modify: `src/components/invoices/InvoiceDetail.tsx`

When viewing an invoice that has a `po_id` set, show a reference link back to the source PO (PO number and status badge). This provides traceability in both directions.

## Technical Details

### Database Changes

**None required.** The `invoices` table already has a `po_id` column (nullable FK to `purchase_orders`), and the `invoice_line_items` table has all the columns needed. The RLS policies already support creating invoices as the `from_org_id` on a contract.

### Invoice Creation Logic

```text
1. Find TC-to-GC contract for this project
   - Query project_contracts WHERE from_org_id = TC org AND to_role = 'General Contractor'
2. Generate invoice number using INV-[TC_INITIALS]-[GC_INITIALS]-[SEQ] pattern
3. Calculate totals:
   - Supplier subtotal from PO line items
   - Markup (user-specified percent or flat amount)
   - Total = subtotal + markup
4. Insert invoice with:
   - project_id, contract_id, po_id
   - billing period, invoice number
   - subtotal = total including markup
   - retainage from contract settings
   - status = 'DRAFT'
5. Insert invoice_line_items:
   - One line per PO line item
   - description from PO item description
   - scheduled_value = line_total (supplier price)
   - current_billed = line_total (full billing)
   - total_billed = line_total
6. If markup > 0, add one additional line item:
   - description = "Material Markup"
   - current_billed = markup amount
```

### Markup Pre-fill Logic

If the PO is linked to a Change Order (via `change_order_projects.linked_po_id`), the markup settings from that Change Order (`material_markup_type`, `material_markup_percent`, `material_markup_amount`) are pre-filled into the dialog. The TC can still adjust before creating the invoice.

### RLS Compatibility

The existing invoice INSERT policy checks: `project_contracts.from_org_id` matches the current user's org. Since the TC is the `from_org_id` on TC-to-GC contracts, this works without any policy changes.

### Files Unchanged

- All database tables and RLS policies (no migration needed)
- `CreateInvoiceFromSOV.tsx` (existing SOV-based invoicing stays separate)
- `InvoicesTab.tsx` (PO-linked invoices automatically appear in the "Sent to GC" list since they're tied to a TC-to-GC contract)
- All PO creation and pricing flows

## Implementation Order

1. Create `CreateInvoiceFromPO.tsx` dialog component
2. Update `PODetail.tsx` to add the "Bill to GC" button and wire the dialog
3. Update `POCard.tsx` to show "Invoiced" badge for POs with linked invoices
4. Update `InvoiceDetail.tsx` to show PO reference when `po_id` is set

