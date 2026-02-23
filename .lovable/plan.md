

# Fix Revision Mode Percentage Bugs in Invoice Wizard

## Root Cause

A database trigger (`update_sov_completion_from_invoice`) automatically subtracts billing percentages from SOV items when an invoice is rejected. The revision wizard code incorrectly assumes these values are still included, leading to double-subtraction and inflated maximums.

## Bugs Found

### Bug 1 -- Max Allowed Percent is too high
**File:** `CreateInvoiceFromSOV.tsx`, line 292-294

The code adds back `revisionLine.billed_percent` to compensate for the original billing still being in the SOV totals. But the rejection trigger already subtracted it, so this gives extra headroom.

**Fix:** Remove the add-back. Use the same formula as non-revision items:
```
maxAllowedPercent = Math.max(0, 100 - (item.total_completion_percent || 0))
```

### Bug 2 -- Previous Billed amount is too low
**File:** `CreateInvoiceFromSOV.tsx`, lines 408-411

The code subtracts `revisionLine.current_billed` from `total_billed_amount` to exclude the old billing. But the trigger already removed it, so this double-subtracts.

**Fix:** Use `total_billed_amount` directly (no subtraction):
```
previousBilled = item.total_billed_amount || 0
```

### Bug 3 -- Trigger fires with old line items
**File:** `CreateInvoiceFromSOV.tsx`, lines 376-435

The submit sequence is:
1. UPDATE invoice status to SUBMITTED (trigger fires, reads OLD line items, adds their percentages)
2. DELETE old line items
3. INSERT new line items

The trigger adds the OLD line items' percentages to SOV items, and the new line items are never reflected.

**Fix:** Reorder operations:
1. DELETE old line items first
2. INSERT new line items
3. UPDATE invoice status to SUBMITTED last (trigger fires, reads NEW line items)

## File Changes

| File | Change |
|------|--------|
| `src/components/invoices/CreateInvoiceFromSOV.tsx` | Fix all 3 bugs in the revision mode logic |

## Technical Details

### CreateInvoiceFromSOV.tsx -- Billing Items Setup (lines 286-304)

Remove the special `adjustedMaxPercent` branch for revision mode. Since the rejection trigger already subtracted the old billing from SOV `total_completion_percent`, the max is simply `100 - total_completion_percent` for all items.

### CreateInvoiceFromSOV.tsx -- Submit Handler (lines 374-444)

Reorder the revision-mode submit to:
1. Delete old `invoice_line_items`
2. Insert new `invoice_line_items`
3. Update invoice record (status, revision_count, clear rejection fields) -- this fires the trigger which correctly reads the new line items
4. Call `update_sov_billing_totals` RPC
5. Log activity

Also fix `previousBilled` to not subtract the old `current_billed` since it's already excluded.

