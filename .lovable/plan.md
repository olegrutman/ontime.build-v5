

# Bug Fix: TC Billing Card Shows $0 — Missing `subtotal` in Invoice Query

## Problem

The invoice query in `useProjectFinancials.ts` (line 206) selects:
```
id, invoice_number, status, total_amount, created_at, paid_at, contract_id, po_id, retainage_amount
```

But lines 304 and 307 reference `i.subtotal` to compute `receivablesInvoiced` and `payablesInvoiced`. Since `subtotal` is never fetched, both are `0`, so Net Position = `$0 - $0 = $0`.

Real data confirms `subtotal` exists and has correct values ($17,064, $19,786, $13,651.20, $10,414.80).

## Fix

### `src/hooks/useProjectFinancials.ts`

**Line 206**: Add `subtotal` to the invoice select query:
```
supabase.from('invoices').select('id, invoice_number, status, subtotal, total_amount, created_at, paid_at, contract_id, po_id, retainage_amount')
```

One field added, one line changed. After this fix:
- Receivables Invoiced = $17,064 + $19,786 = $36,850
- Payables Invoiced = $13,651.20 + $10,414.80 = $24,066
- Net Position = $36,850 - $24,066 = **$12,784**

