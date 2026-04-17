
## Root cause: Missing RLS policy for `READY_FOR_DELIVERY` transition

### The bug
The supplier clicks "Schedule Delivery" on an `ORDERED` PO. The handler (`PODetail.tsx` L435-440) runs:
```ts
UPDATE purchase_orders SET status='READY_FOR_DELIVERY', ready_for_delivery_at=<date> WHERE id=<po_id>
```

But the existing supplier RLS policies on `purchase_orders` are:

| Policy | USING (current row) | WITH CHECK (new row) |
|---|---|---|
| Supplier can update submitted POs | `status='SUBMITTED'` | new status ∈ {SUBMITTED, PRICED, ORDERED} |
| Supplier can update priced POs | `status='PRICED'` | new status ∈ {PRICED, ORDERED} |
| Supplier can mark PO as delivered | `status='ORDERED'` | new status = `'DELIVERED'` |

**There is NO policy that allows a supplier to update a PO whose current status is `ORDERED` to a new status of `READY_FOR_DELIVERY`.** The "Mark Delivered" policy is the only one that matches the USING clause (`status='ORDERED'`) but its WITH CHECK only permits `DELIVERED` — not `READY_FOR_DELIVERY`. So the UPDATE is blocked → "You do not have permission to update this purchase order".

Same problem for "Reschedule" on a `READY_FOR_DELIVERY` PO — no policy permits supplier updates from that state at all.

### The fix
Add **one RLS policy** allowing the supplier-of-record to manage the delivery scheduling lifecycle:

```sql
CREATE POLICY "Supplier can schedule delivery"
ON public.purchase_orders FOR UPDATE
USING (
  is_supplier_for_purchase_order(id)
  AND status = ANY (ARRAY['ORDERED'::po_status, 'READY_FOR_DELIVERY'::po_status])
)
WITH CHECK (
  is_supplier_for_purchase_order(id)
  AND status = ANY (ARRAY['ORDERED'::po_status, 'READY_FOR_DELIVERY'::po_status, 'DELIVERED'::po_status])
);
```

This single policy covers:
- `ORDERED` → `READY_FOR_DELIVERY` (initial schedule)
- `READY_FOR_DELIVERY` → `READY_FOR_DELIVERY` (reschedule / change date)
- `READY_FOR_DELIVERY` → `DELIVERED` (mark delivered after scheduling)
- Stays consistent with existing policy style (uses `is_supplier_for_purchase_order` SECURITY DEFINER helper, no recursion risk).

The existing "Supplier can mark PO as delivered" policy still covers the direct `ORDERED → DELIVERED` shortcut.

### Why the client code is already correct
- `PODetail.tsx` `handleScheduleDelivery` correctly sends both fields in one update — RLS WITH CHECK only validates row state, not which columns changed, so no client change needed.
- The "Mark Delivered" button after scheduling will continue to work via the new combined policy.

### Files modified
- **Migration** (one new RLS policy on `public.purchase_orders`)

### Files NOT touched
- `PODetail.tsx`, `ScheduleDeliveryDialog.tsx`, hooks — already correct
- No other RLS policies altered

### Verification after implementation
- As supplier on an `ORDERED` PO → click Schedule Delivery → save → no error, status flips to `READY_FOR_DELIVERY`, date persists.
- Click Reschedule → change date → no error, date updates.
- Click Mark Delivered on a `READY_FOR_DELIVERY` PO → status flips to `DELIVERED`.
- Non-supplier users still cannot update through this policy (helper enforces supplier-of-record).
