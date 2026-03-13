

# Fix PO Pricing Lock — 3 Bugs Found

## Bug 1: Broken Promise.all (Root Cause of Timeouts)

Lines 292-293 in `PODetail.tsx` have a syntax error from the previous refactor:

```typescript
const promise = supabase        // ← assigns the client object
  supabase                       // ← starts a NEW detached expression
    .from('po_line_items')
    .update({...})
```

`promise` gets assigned the bare `supabase` client (not a Promise). The actual `.from().update()` chain runs as a detached, fire-and-forget expression. So `Promise.all(updatePromises)` resolves instantly, and the PO-level PATCH fires while all line item PATCHes are still in flight — causing lock contention and the `statement timeout` errors seen in the network logs.

**Fix**: Remove the duplicate `supabase` on line 293 so the chain is properly assigned to `promise`.

## Bug 2: Database Trigger References Invalid Enum Value

The trigger `trg_cleanup_po_notification` contains:
```sql
IF NEW.status IN ('ORDERED', 'DELIVERED', 'CANCELLED') THEN
```

`'CANCELLED'` does not exist in the `po_status` enum. When Postgres evaluates this expression during any PO update, it attempts to cast `'CANCELLED'` to `po_status` and throws error `22P02: invalid input value for enum po_status: "CANCELLED"`. This is the second error in the console logs — it fires when the user clicks "Mark Ordered" after the pricing lock attempt.

**Fix**: Database migration to replace the trigger function, removing `'CANCELLED'` from the IN list.

## Bug 3: AlertDialogFooter ref warning (minor)

`AlertDialogFooter` is a plain function component receiving a ref from Radix. Minor console noise, no functional impact.

**Fix**: Skip for now — cosmetic only.

## Files to Change

| File / Resource | Change |
|---|---|
| `src/components/purchase-orders/PODetail.tsx` | Fix line 292-293: remove duplicate `supabase` so promise chain is captured correctly |
| Database migration | Fix `cleanup_po_notification` trigger function to remove `'CANCELLED'` from the IN clause |

## Summary

The timeout is not a parallelization design problem — it's that the parallelization was broken by a syntax error. Once the promise chain is properly captured, `Promise.all` will actually wait for all line items to finish before updating the PO header, eliminating lock contention. The trigger fix eliminates the enum cast error on status transitions.

