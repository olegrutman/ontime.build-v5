

# Simplify TC Net Position to Total Gross Margin

## Formula

```
Net Position = Total Receivables (Invoiced to GC) − Total Payables (Invoiced by FC)
```

Using real data: $36,850 − $24,066 = **$12,784**

This is the TC's total invoiced profit margin across all billing — simple, clear, always correct.

## Changes

### `src/components/project/BillingCashCard.tsx` (3 lines)

1. **Line 52**: Change `netCash` from `receivablesOutstanding - payablesOutstanding` to `receivablesInvoiced - payablesInvoiced`
2. **Line 90**: Update label to `"Net Position"` (already correct)
3. **Line 91**: Update subtitle from `"Receivables Outstanding − Payables Outstanding"` to `"Total Invoiced to GC − Total Invoiced by FC"`

No hook changes, no database changes. 1 file, 2-3 lines.

