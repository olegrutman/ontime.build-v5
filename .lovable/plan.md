
Issue confirmed:
- I traced the PO card click flow and found the main bug causing the blank detail state with “Purchase Order not found”.
- This is not a permissions issue first; it is a broken detail query.

What is happening now
1. In `PurchaseOrdersTab.tsx`, clicking a PO card correctly sets `selectedPOId`.
2. That renders `PODetail` with the selected PO id.
3. Inside `PODetail.tsx`, `fetchPO()` runs this query:
   - `purchase_orders`
   - joins `supplier`, `project`, and `work_item:work_items(id, title)`
4. The backend returns HTTP 400 because there is no foreign-key relationship between `purchase_orders` and `work_items`.
5. Since the query fails, `po` never loads, and the screen falls into the “Purchase Order not found” state.

Evidence I verified
- Network request for PO detail failed with:
  - `PGRST200`
  - “Could not find a relationship between 'purchase_orders' and 'work_items' in the schema cache”
- Database schema confirms `purchase_orders` does not currently have a `work_item_id` column.
- The list view works because the list query does not request the broken `work_item` relation.

Secondary bugs I found
- In `COMaterialsPanel.tsx`, “Open PO workflow” only navigates to:
  - `/project/:id?tab=purchase-orders`
  - It does not open the specific linked PO.
- Linked CO pricing requests are stored correctly, but the PO tab has no URL-driven deep-link support yet, so even after navigation the intended PO is not automatically selected.
- The supplier-pricing section can make a request look “sent/opened” operationally while the linked PO record is still `ACTIVE`, which is confusing.

Plan to fix
1. Fix the broken PO detail fetch
- Remove the invalid `work_item:work_items(...)` join from `PODetail.tsx`.
- Keep only relations that are actually valid (`supplier`, `project`).
- If work-order context is needed, load it separately only when a real FK/column exists.

2. Make PO detail robust on errors
- Add explicit error handling in `fetchPO()` so query failures show a real error message instead of a misleading “not found”.
- Distinguish:
  - invalid query / backend error
  - record missing
  - access denied

3. Add deep-link support for opening a specific PO
- Update `PurchaseOrdersTab.tsx` to read a query param like `po=<id>` from the URL.
- When present, initialize `selectedPOId` from that param.
- Keep the URL in sync when opening/closing a PO detail.

4. Fix CO → PO navigation
- Update `COMaterialsPanel.tsx` so “Open PO workflow” navigates to:
  - `/project/${projectId}?tab=purchase-orders&po=${activePricingRequest.id}`
- That will open the exact linked PO instead of only switching tabs.

5. Tighten linked-request status messaging
- Show the real lifecycle label from the actual PO status:
  - `ACTIVE` = pricing draft
  - `PENDING_APPROVAL` = awaiting GC approval
  - `SUBMITTED` = sent to supplier
- Avoid wording that implies “sent” when the PO is still only a draft.

6. Verify both GC and TC flows after fix
- Test standard PO cards on the Purchase Orders tab.
- Test CO-linked pricing request cards opened from Change Orders.
- Verify for both GC and TC users that:
  - card click opens detail
  - browser refresh on a deep-linked PO still opens the correct detail
  - back action returns to the PO list cleanly

Expected result
- TC and GC can click any visible PO card and actually open the detail view.
- CO-linked POs open directly from the Change Order materials panel.
- The UI will no longer say “Purchase Order not found” for valid records.
- Status labels will match the true PO state, reducing “shown as sent but can’t be viewed” confusion.

Technical note
- The root cause is the invalid `work_item` join in `PODetail.tsx`, not the PO data itself.
- The deep-link/navigation issue is a second bug that affects CO-linked POs specifically.

<lov-actions>
<lov-suggestion message="Test the PO flow end-to-end for both GC and TC after the detail query and deep-link fixes.">Verify that it works</lov-suggestion>
<lov-suggestion message="Fix the Purchase Order detail fetch by removing the invalid work_item relation and adding proper error handling.">Fix PO detail loading</lov-suggestion>
<lov-suggestion message="Add URL deep-link support so a specific PO can open directly from /project/:id?tab=purchase-orders&po=...">Add PO deep-linking</lov-suggestion>
<lov-suggestion message="Update the Change Order materials panel so 'Open PO workflow' opens the exact linked PO instead of only switching tabs.">Fix CO to PO navigation</lov-suggestion>
<lov-suggestion message="Clean up PO status messaging so pricing requests clearly show Draft, Awaiting Approval, or Sent to Supplier based on the actual PO status.">Improve PO status labels</lov-suggestion>
</lov-actions>
