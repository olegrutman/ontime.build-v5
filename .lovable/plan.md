

## Show supplier pricing from linked PO on CO detail materials

**What the user sees today**: The materials panel shows the linked PO status (e.g. "Priced", "Ordered") but does NOT show the actual unit prices the supplier entered on the PO line items. The CO material rows still display whatever placeholder cost was set when the materials were added.

**What should happen**: When a linked PO reaches PRICED/ORDERED/DELIVERED status, the CO materials table should reflect the supplier's actual pricing from the PO line items, giving the TC/GC immediate visibility without navigating to the PO.

### Plan

**1. Fetch supplier pricing from linked PO line items** (`COMaterialsPanel.tsx`)
- After `fetchLinkedRequests` resolves and finds a PO in PRICED/ORDERED/DELIVERED status, run a second query:
  ```
  po_line_items(unit_price, line_total, source_co_material_item_id)
  WHERE po_id = activePricingRequest.id
  ```
- Build a `Map<co_material_item_id, { unit_price, line_total }>` from the results.

**2. Display supplier pricing inline on material rows**
- In the materials table, when a supplier price map entry exists for a material row:
  - Show the supplier's `unit_price` in the "Unit cost" column (with a visual indicator like a small "Supplier" badge or different color if it differs from the original).
  - Update the "Amount" column to use the supplier's `line_total`.
- Add a subtle label like "Supplier priced" next to the totals footer when supplier pricing is active.

**3. Update totals to reflect supplier pricing**
- When supplier pricing data is available, override `totalCost` and `totalBilled` calculations to use the supplier line totals instead of the CO material item's original values.
- Keep the markup calculation based on CO material markup_percent applied to the supplier unit price.

**4. Optionally sync pricing back to CO material items**
- Add a "Apply supplier pricing" action button that updates `co_material_items.unit_cost` with the supplier's prices, so the CO financials permanently reflect the quoted costs. This would recalculate `line_cost` and `billed_amount` via the existing markup logic.

### Files to change
- `src/components/change-orders/COMaterialsPanel.tsx` — fetch PO line items, overlay pricing in table, update totals

