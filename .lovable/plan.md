
Issue confirmed from live data:
- I traced the failure to the first supplier pricing write, not the UI form.
- The PO detail loads correctly for PO `f423878b-2c14-422b-9102-3522b2f2ca05`, and its line items load correctly.
- When the supplier clicks Save Pricing, the app sends a valid PATCH to `po_line_items`, but the backend returns:
  - `500`
  - code `57014`
  - `canceling statement due to statement timeout`

Do I know what the issue is?
- Yes.

What the problem is:
1. Primary bug: supplier pricing updates are timing out inside backend access rules
- The failing request is the first `PATCH /po_line_items?id=...`.
- The request body is valid (`unit_price`, `line_total`, `price_source`, etc.).
- There are no row triggers on `po_line_items`, so the most likely cause is the supplier UPDATE policy path itself.
- Current supplier update policies for `po_line_items` and `purchase_orders` rely on cross-table `EXISTS (...)` checks against `purchase_orders` and `suppliers` under RLS.
- That nested policy evaluation is the likely source of the timeout.

2. Secondary bug: frontend and backend rules do not match for pricing edits
- `usePOPricingVisibility` lets suppliers edit pricing in both `SUBMITTED` and `PRICED`.
- The database policy only allows supplier line-item updates when the PO is `SUBMITTED`.
- So even after the timeout fix, editing a `PRICED` PO would still be inconsistent unless rules are aligned.

3. Secondary bug: frontend and backend rules do not match for “Mark Ordered”
- `PODetail` shows “Mark Ordered” directly from `SUBMITTED`.
- The database policy only allows supplier transition to `ORDERED` from `PRICED`.
- That button will fail or behave inconsistently unless the workflow is aligned.

Plan to fix:
1. Replace the expensive supplier RLS checks with helper functions
- Add small `SECURITY DEFINER` helper functions that answer:
  - can this user supplier-price this PO?
  - can this user transition this PO status?
- Rewrite the supplier UPDATE policies on:
  - `po_line_items`
  - `purchase_orders`
- Make the policies call those helpers by `po_id`/`purchase_orders.id` instead of doing nested joins inside the policy itself.

2. Align the supplier pricing workflow rules
- Choose one consistent rule and implement it end-to-end:
  - Either supplier can edit only while `SUBMITTED`
  - Or supplier can also reopen/edit while `PRICED`
- Then update both:
  - backend policies
  - `usePOPricingVisibility.ts`
  - `PODetail.tsx` action visibility

3. Align the ordering transition
- Choose one workflow:
  - strict flow: `SUBMITTED -> PRICED -> ORDERED`
  - flexible flow: supplier may go `SUBMITTED -> ORDERED`
- Then make UI and backend match.
- Right now the UI suggests the flexible flow, but backend enforces the strict flow.

4. Improve failure reporting in the PO screen
- In `PODetail.tsx`, surface timeout/RLS failures with a clearer message than generic “Failed to save pricing”.
- Include item/PO context in console logging so future failures are easier to trace.

5. Re-test the exact supplier scenario
- Re-run pricing save on the current deep-linked PO:
  - `/project/86e68e92-e94c-48b4-bf2d-89417049b72e?tab=purchase-orders&po=f423878b-2c14-422b-9102-3522b2f2ca05`
- Verify:
  - both line item updates succeed
  - PO totals save
  - Lock Pricing changes status correctly
  - Order transition matches the chosen workflow
  - no more `57014` timeout on `po_line_items`

Files likely involved:
- `supabase/migrations/...` for helper functions + RLS policy rewrite
- `src/hooks/usePOPricingVisibility.ts`
- `src/components/purchase-orders/PODetail.tsx`

Expected outcome:
- Save Pricing stops timing out.
- Supplier actions match the actual PO lifecycle.
- The PO screen no longer offers actions that the backend rejects.
