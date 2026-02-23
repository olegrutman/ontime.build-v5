

# Revise & Resubmit via Invoice Creation Wizard

## Overview
When a rejected invoice's "Revise & Resubmit" button is clicked, instead of just reverting to DRAFT, open the `CreateInvoiceFromSOV` wizard pre-populated with the rejected invoice's existing data (contract, billing period, notes, SOV item percentages). The user adjusts the SOV item percentages and clicks a "Resubmit Invoice" button, which updates the existing invoice record in-place (same invoice number, incremented revision count).

## Changes

### 1. `src/components/invoices/CreateInvoiceFromSOV.tsx`

Add support for a **revision mode** via new optional props:

- `revisionInvoiceId?: string` -- if set, the wizard is in revision mode
- `revisionData?: { contractId, invoiceNumber, periodStart, periodEnd, notes, lineItems[], revisionCount }` -- pre-populates the form

**Behavior in revision mode:**
- Skip contract selection -- auto-select and lock the contract from the original invoice
- Pre-fill invoice number, billing period, and notes (all editable except invoice number)
- Pre-populate SOV item toggles and percentages from the original invoice's line items
- The SOV `maxAllowedPercent` calculation must add back the original `current_billed` percent (since we're replacing, not stacking)
- Change the submit button label from "Create Invoice" to "Resubmit Invoice"
- On submit: UPDATE the existing invoice instead of INSERT, DELETE old line items and INSERT new ones, increment `revision_count`, clear rejection fields, set status to SUBMITTED

### 2. `src/components/invoices/InvoiceDetail.tsx`

- Replace the current `handleRevise` function with one that opens the wizard
- Add state: `reviseDialogOpen` and pass the invoice's data to the wizard
- Pass the invoice's contract_id, line items, billing period, notes, and revision count
- On wizard success: refresh the invoice detail and call `onUpdate`

### 3. `src/components/invoices/InvoicesTab.tsx`

No changes needed -- the revision wizard is opened from InvoiceDetail, not from InvoicesTab.

## Technical Details

### Revision mode submit logic (in CreateInvoiceFromSOV)

```
// Instead of INSERT:
1. UPDATE invoices SET
     status = 'SUBMITTED',
     billing_period_start, billing_period_end, notes,
     subtotal, retainage_amount, total_amount,
     submitted_at = now(), submitted_by = user.id,
     revision_count = revisionCount + 1,
     rejected_at = null, rejected_by = null, rejection_reason = null
   WHERE id = revisionInvoiceId

2. DELETE FROM invoice_line_items WHERE invoice_id = revisionInvoiceId

3. INSERT new line items (same as normal creation)

4. Update SOV billing totals via RPC
```

### Pre-populating SOV percentages

When in revision mode, after SOV items load, match each SOV item against the original invoice's line items by `sov_item_id`. For matched items:
- Set `enabled = true`
- Set `thisBillPercent` to the original `billed_percent`
- Adjust `maxAllowedPercent` by adding back the original percent (since the old billing is being replaced)

### Props interface change

```typescript
interface CreateInvoiceFromSOVProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSuccess: () => void;
  // Revision mode
  revisionInvoiceId?: string;
  revisionData?: {
    contractId: string;
    invoiceNumber: string;
    periodStart: string;
    periodEnd: string;
    notes: string | null;
    revisionCount: number;
    lineItems: Array<{
      sov_item_id: string;
      billed_percent: number;
      current_billed: number;
    }>;
  };
}
```

## File Changes

| File | Change |
|------|--------|
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Add revision mode props, pre-populate form, UPDATE instead of INSERT on submit |
| `src/components/invoices/InvoiceDetail.tsx` | Replace `handleRevise` to open wizard with revision data, add state and dialog |

