

# Conditionally Show Retainage in Invoice Export

## What
- Hide the "Retainage Withheld" row in the totals section when the contract has no retainage (`retainage_percent` is 0 or null)
- The "Previously Billed" row already exists and displays correctly — no change needed there

## Change

### `supabase/functions/invoice-download/index.ts`

1. **Determine if retainage applies**: Check `invoice.contract?.retainage_percent > 0` (already fetched in the query)

2. **Conditionally render the retainage row** (~line 406-409): Wrap the retainage totals row in a conditional so it only appears when retainage is active:
   ```
   ${hasRetainage ? `<div class="totals-row retainage">...</div>` : ''}
   ```

3. **Also conditionally hide the retainage column in the line items table** if retainage doesn't apply — currently no retainage column exists in the table so this is already fine.

### Files Changed
- `supabase/functions/invoice-download/index.ts` — conditional retainage row in totals

