

# Allow Invoice Deletion Before Approval

## Problem
Currently, the delete button only appears on invoices with `DRAFT` status. Users should be able to delete invoices they created as long as they haven't been approved yet -- meaning `DRAFT`, `SUBMITTED`, and `REJECTED` statuses should all be deletable by the creator/submitter.

## Changes

### 1. `src/components/invoices/InvoiceCard.tsx`
- Line 110: Change condition from `invoice.status === 'DRAFT'` to `['DRAFT', 'SUBMITTED', 'REJECTED'].includes(invoice.status)` for the delete hover action

### 2. `src/components/invoices/InvoiceTableView.tsx`
- Line 175: Same condition change for the delete button in the table actions column

### 3. `src/components/invoices/InvoicesTab.tsx`
- Line 411: Change `canSubmit ? handleDeleteInvoice : undefined` -- the `canSubmit` permission check is correct (it means the user is the creator/from-org), but need to confirm it's passed for non-DRAFT invoices too. The `onDelete` prop is already gated by `canSubmit` which is the right permission (creator org can delete their own invoices before approval).

### 4. Add confirmation dialog
- Wrap the delete action in an `AlertDialog` confirmation, especially important for `SUBMITTED` invoices since they're already in review. The dialog should warn: "This invoice has been submitted and is awaiting review. Are you sure you want to delete it?"

All 3 files, ~10 lines changed total. No database changes needed -- the existing RLS policies already allow the creator org to delete their invoices.

