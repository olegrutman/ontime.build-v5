

# Fix PO Pricing Save/Lock — Bugs and Performance

## Bugs Found

### Bug 1: Sequential line item updates cause timeout
The `savePriceEdits` function (line 264-291) updates each line item **one at a time** with `await` in a `for` loop. A PO with 20 items means 20 sequential HTTP requests, each taking 1-3 seconds. This routinely exceeds the database statement timeout, producing the error: `"canceling statement due to statement timeout"`.

**Fix**: Use `Promise.all()` to fire all line item updates in parallel. 20 parallel requests complete in ~2 seconds instead of 40+.

### Bug 2: "CANCELLED" status error in console
The console shows `invalid input value for enum po_status: "CANCELLED"`. The `po_status` enum only has `ACTIVE | SUBMITTED | PRICED | ORDERED | DELIVERED`. Something in PODetail calls `updatePOStatus('CANCELLED')`. Looking at the code, there's no explicit CANCELLED call visible — this is likely coming from a stale browser interaction or another component. The `POStatusBadge` or action buttons may reference it. Since there's no Cancel button in the current code, this is likely a user clicking something from a cached old version. No code fix needed for this one — it's not a code path that exists.

### Bug 3: No progress feedback during save
The user clicks "Lock Pricing", sees a spinner, and then either nothing happens for 30+ seconds or it fails silently. No progress indicator, no item count, no confirmation dialog before locking.

## Plan

### 1. Parallelize line item updates in `savePriceEdits`
In `src/components/purchase-orders/PODetail.tsx`, replace the sequential `for...of` loop with `Promise.all()`:
- Build an array of update promises for all line items
- Execute them all in parallel
- Calculate subtotals during the build phase (no DB needed for that)
- Then do the single PO-level update

### 2. Add confirmation dialog before Lock Pricing
Before calling `savePriceEdits(true)`, show an `AlertDialog` confirming the action: "Lock pricing at $X,XXX.XX? This will mark the PO as Priced and notify the buyer." Prevents accidental locks.

### 3. Add progress/disabled state feedback
- Disable both Save and Lock buttons while either is in progress
- Show "Saving X items..." text in the button during the operation

## Files to Change
- `src/components/purchase-orders/PODetail.tsx` — parallelize updates, add lock confirmation dialog, improve button feedback

