
Goal
- Fix the CO workflow so a TC reviewing an FC-originated CO uses one action that approves the FC portion and immediately forwards the CO to GC.
- Let both GC and TC add CO materials from project estimates/catalog, then send that material list to the supplier for pricing using the existing PO workflow.
- Keep FC pricing separate from TC pricing: FC amounts are TC cost, not merged into TC-entered CO pricing.

What I found
- Current FC → TC review is only partially implemented: `COStatusActions` lets a TC “Approve” an FC-created submitted CO, but the mutation marks the whole CO `approved`, which skips the GC stage.
- `COMaterialsPanel` already reuses the PO picker stack (`ProductPickerContent`, estimate packs, PSM browser), but editing is hard-coded to TC only.
- PO logic already supports the exact supplier-pricing lifecycle you want: draft PO, approval gate, send to supplier, supplier pricing, pricing-owner visibility.
- CO financials currently aggregate FC + TC billable labor into one `laborTotal`, so FC pricing is being mixed into TC pricing instead of treated as TC cost/pass-through.

Implementation plan
1. Fix FC → TC → GC workflow
- Add a dedicated “Approve & send to GC” path for TCs reviewing FC-originated COs.
- Change the TC approval branch so it does not finalize the CO as `approved`.
- On TC approval:
  - resolve the upstream GC org for the project,
  - switch `assigned_to_org_id` from FC to GC,
  - keep the CO in the GC review lane (`submitted`),
  - log distinct activity entries for TC approval and GC forwarding,
  - notify GC instead of treating it as final approval.
- Update action labels/text in `COStatusActions` so the TC sees the correct intent.

2. Reuse PO logic for supplier pricing from CO materials
- Expand `COMaterialsPanel` permissions so GC and TC can both:
  - add materials manually,
  - add from approved estimate packs/materials,
  - open the catalog picker.
- Add a new materials action such as “Send to supplier for pricing”.
- That action should create a draft PO from the current CO materials using the same rules already used in `PurchaseOrdersTab`:
  - supplier resolution,
  - pricing owner resolution,
  - PO approval gate for TC when required,
  - supplier send flow via existing PO mechanics.
- Keep supplier pricing inside the standard PO detail flow instead of inventing a separate CO-specific pricing UI.

3. Add CO ↔ PO linkage so the flow is trackable
- The current schema has no durable link from a PO back to a CO/material row.
- Add minimal nullable link fields so CO material requests can be traced and refreshed safely:
  - purchase order → source CO,
  - PO line item → source CO material item.
- Use those links to:
  - prevent duplicate pricing requests,
  - show “draft / sent / priced” status back on the CO,
  - hydrate priced supplier values back into the CO materials view when needed.

4. Separate FC cost from TC pricing
- Refactor CO derived financials in `useChangeOrderDetail` so FC billable labor is not blended into TC-entered pricing totals.
- Introduce separate derived buckets for:
  - FC labor cost to TC,
  - TC direct labor pricing,
  - actual costs,
  - GC-facing reviewed total.
- Update `COLineItemRow` and `CODetailPage` so:
  - FC still sees only its own entries/private actuals,
  - TC sees FC amounts as cost/pass-through,
  - GC sees the reviewed upstream total, not raw combined FC+TC labor math.
- Keep actual-cost privacy rules unchanged.

5. Keep PO pricing visibility rules intact
- Reuse existing PO visibility logic (`pricing_owner_org_id`, supplier visibility, FC hidden pricing).
- Ensure supplier-priced material requests created from COs inherit the same privacy behavior as normal POs.
- TC should not see GC-owned pricing, and FC should never see supplier pricing.

6. Testing/verification pass
- Validate these flows after implementation:
  - FC submits CO → TC sees “Approve & send to GC” → GC then sees normal approve/reject.
  - GC and TC can both add CO materials from estimate/catalog.
  - “Send to supplier for pricing” creates a draft PO from CO materials and follows approval/send logic.
  - Supplier pricing updates are visible through PO flow and reflected back on the CO.
  - FC labor remains separate from TC pricing totals in all views.

Primary files likely involved
- `src/components/change-orders/COStatusActions.tsx`
- `src/hooks/useChangeOrderDetail.ts`
- `src/components/change-orders/CODetailPage.tsx`
- `src/components/change-orders/COLineItemRow.tsx`
- `src/components/change-orders/COMaterialsPanel.tsx`
- `src/components/project/PurchaseOrdersTab.tsx`
- `src/components/purchase-orders/PODetail.tsx`
- `src/hooks/usePOPricingVisibility.ts`
- `src/integrations/supabase/types.ts` (read-only generated reference only; schema changes would be done through backend migration, not manual edits)

Technical notes
- This is not just a button tweak; the FC→TC→GC handoff needs a distinct workflow branch because current `approveCO` is terminal.
- The material pricing feature should piggyback on PO records, not supplier estimates, because you chose the PO-style tracked workflow.
- To make that robust, backend link fields are the cleanest solution; otherwise the app would have to rely on fragile note text matching.
