

# Implement TC Billing & Cash Position with Outstanding-Based Net Cash

## Summary

Change the Net Cash formula from `Collected − Paid` to `Receivables Outstanding − Payables Outstanding`, where each "Outstanding" = Invoiced (non-draft) − Paid − Retainage.

The `submitted` filter already excludes DRAFTs (line 275: keeps SUBMITTED, APPROVED, PAID), so the "Invoiced" totals already match the user's intent.

## Changes

### 1. `src/components/project/BillingCashCard.tsx` (3 lines)

- **Line 53**: Change `netCash` from `receivablesCollected - payablesPaid` to `receivablesOutstanding - payablesOutstanding`
- **Line 91**: Update subtitle from `"Collected − Paid"` to `"Receivables Outstanding − Payables Outstanding"`
- Optionally rename label from "Net Cash Position" to "Net Position" since it now represents outstanding balances, not actual cash moved

### 2. No hook changes needed

The hook already computes the right values — `receivablesInvoiced` sums `subtotal` (gross) for non-draft invoices, `receivablesCollected`/`payablesPaid` sum paid amounts, and retainage is tracked. The card already computes `receivablesOutstanding` and `payablesOutstanding` correctly. We just need to subtract them for net.

## Verification

With both invoices APPROVED (not paid):
- Receivables Outstanding = $17,064 − $0 − $853.20 = $16,210.80
- Payables Outstanding = $13,651.20 − $0 − $682.56 = $12,968.64
- Net Position = $16,210.80 − $12,968.64 = **$3,242.16** (TC's spread)

With both PAID:
- Receivables Outstanding = $17,064 − $16,210.80 − $853.20 = $0
- Payables Outstanding = $13,651.20 − $12,968.64 − $682.56 = $0
- Net Position = $0 − $0 = **$0** (everything settled)

**1 file, 2-3 lines changed. No database changes.**

