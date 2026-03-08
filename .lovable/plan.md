

# Allow Edit and Delete of Draft Invoices

## Current State

- **Edit**: The InvoiceCard has an "Edit" button for DRAFT invoices, but it just navigates to InvoiceDetail — there's no actual edit capability (no inline editing of line items, notes, or billing period).
- **Delete**: There is no delete functionality anywhere — no button, no handler, no confirmation dialog.

## Plan

### 1. Add Delete Invoice capability

**InvoiceDetail.tsx** — Add a "Delete Invoice" button (with confirmation dialog) visible only when `status === 'DRAFT' && canSubmit`:
- Add a delete confirmation `AlertDialog` (reuse existing pattern from reject dialog)
- Handler: delete `invoice_line_items` where `invoice_id = id`, then delete `invoices` where `id = invoiceId`, call `onUpdate()` and `onBack()`
- Button placed in the action buttons area, styled as destructive/outline

**InvoiceCard.tsx** — Add a delete hover action (trash icon) for DRAFT invoices when `canSubmit` is true:
- Add `onDelete` optional prop
- Add trash icon to `hoverActions` array for DRAFT status

**InvoicesTab.tsx** — Add `handleDeleteInvoice` handler:
- Delete line items then invoice from database
- Show toast, refresh list
- Pass `onDelete` to `InvoiceCard`

### 2. Add Edit Invoice capability (reopen SOV wizard for DRAFT)

**InvoiceDetail.tsx** — Add an "Edit Invoice" button for DRAFT status that opens the existing `CreateInvoiceFromSOV` wizard pre-populated with revision data:
- Reuse the same `reviseDialogOpen` / `CreateInvoiceFromSOV` pattern already used for rejected invoices
- Show the button when `status === 'DRAFT' && canSubmit`

### Files to Change

- `src/components/invoices/InvoiceDetail.tsx` — Add delete button + confirmation dialog + edit button for DRAFT
- `src/components/invoices/InvoiceCard.tsx` — Add `onDelete` prop + trash hover action
- `src/components/invoices/InvoicesTab.tsx` — Add delete handler, pass to cards

