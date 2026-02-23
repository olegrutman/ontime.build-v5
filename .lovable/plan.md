

# Fix: RLS Policy Blocking Invoice Line Item Insert During Revision

## Problem

The INSERT RLS policy on `invoice_line_items` requires the parent invoice to be in `DRAFT` status:

```sql
i.status = 'DRAFT'
```

But after reordering the submit operations (DELETE old items -> INSERT new items -> UPDATE status), the invoice is still in `REJECTED` status when the INSERT happens, causing the RLS violation.

## Solution

The fix requires a small change to the submission order in `CreateInvoiceFromSOV.tsx`. We need to first update the invoice status to `DRAFT` (which satisfies RLS), then delete old line items, insert new ones, and finally update the status to `SUBMITTED` (which fires the trigger with the correct new line items).

### Updated operation order:

1. **UPDATE** invoice status to `DRAFT` (satisfies RLS for line item operations)
2. **DELETE** old `invoice_line_items`
3. **INSERT** new `invoice_line_items` (now allowed because invoice is `DRAFT`)
4. **UPDATE** invoice status to `SUBMITTED` with all other fields (revision_count, cleared rejection, totals) -- trigger fires here and reads new line items
5. Call `update_sov_billing_totals` RPC
6. Log activity

### File Changes

| File | Change |
|------|--------|
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Split the invoice update into two steps: first set status to DRAFT, then after line item operations, set to SUBMITTED with all other fields |

### Technical Detail

In `CreateInvoiceFromSOV.tsx`, the revision-mode submit block (around line 372) will be updated to:

```typescript
// Step 1: Set status to DRAFT so RLS allows line item operations
await supabase.from('invoices')
  .update({ status: 'DRAFT' })
  .eq('id', revisionInvoiceId);

// Step 2: Delete old line items
await supabase.from('invoice_line_items')
  .delete()
  .eq('invoice_id', revisionInvoiceId);

// Step 3: Insert new line items (RLS passes because status is now DRAFT)
await supabase.from('invoice_line_items')
  .insert(lineItemsToInsert);

// Step 4: Update invoice to SUBMITTED with all fields (trigger fires here)
await supabase.from('invoices')
  .update({
    status: 'SUBMITTED',
    revision_count: revisionData.revisionCount + 1,
    rejected_at: null, rejected_by: null, rejection_reason: null,
    subtotal, retainage_amount, total_amount,
    billing_period_start, billing_period_end, notes,
    submitted_at: new Date().toISOString(),
    submitted_by: user.id,
  })
  .eq('id', revisionInvoiceId);
```

This is a single-file change with no database migration needed.

