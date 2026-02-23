
# Revise & Resubmit Flow for Rejected Invoices

## Overview
When an invoice is rejected, the contractor (from_org) will see a "Revise & Resubmit" button that reverts the invoice back to DRAFT status -- keeping the same invoice number. The contractor can then edit line items and resubmit. The rejection reason remains visible as context.

## Changes

### 1. `src/components/invoices/InvoiceDetail.tsx`

**Add a "Revise & Resubmit" button** for rejected invoices when the user is the invoice creator (`isInvoiceCreator`):

- After the existing rejection notice card, add a button: "Revise & Resubmit"
- On click, call `updateInvoiceStatus('DRAFT')` which clears the rejection fields:
  ```
  rejected_at: null
  rejected_by: null
  rejection_reason: null
  ```
- The existing `DRAFT` + `canSubmit` logic already shows the "Submit for Approval" button, so once reverted the normal flow resumes
- Keep the rejection reason visible in a muted info banner while in DRAFT (if the invoice was previously rejected), so the contractor knows what to fix

**Add a `revision_count` display**: Show "Revision 1", "Revision 2" etc. next to the invoice number if the invoice has been rejected and resubmitted before. This is tracked by counting how many times `rejected_at` has been set (we can add a simple `revision_count` integer column).

### 2. Database Migration

Add a `revision_count` column to the `invoices` table:
```sql
ALTER TABLE invoices ADD COLUMN revision_count integer NOT NULL DEFAULT 0;
```

When the invoice is reverted to DRAFT after rejection, increment `revision_count` by 1 in the update call.

### 3. Invoice Number Handling

- The invoice number stays the same -- no suffix needed
- The `revision_count` is displayed in the UI as a small badge (e.g., "Rev 2") next to the status badge when > 0
- This keeps the numbering clean while providing audit trail

## Summary of File Changes

| File | Change |
|------|--------|
| `src/components/invoices/InvoiceDetail.tsx` | Add "Revise & Resubmit" button for rejected invoices, show revision badge, keep rejection context visible |
| Database migration | Add `revision_count` integer column to `invoices` table |
