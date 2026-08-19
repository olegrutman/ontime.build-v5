# GC → Owner pricing on change orders

Rename the GC's internal "GC Budget" to an explicit **GC to Owner Budget**, let the GC set a markup %, and make the approval step ask whether the cost is passed to the owner — with the resulting price flowing into the owner contract.

## What changes for the user

1. **Card rename + margin entry (CO detail)**
   - "GC Budget" becomes **GC TO OWNER BUDGET**.
   - Two ways to fill it: type the owner price directly, or type a **markup %** and the owner price is computed as `GC cost x (1 + %)`.
   - GC cost = approved downstream (TC/FC) amount + any materials/equipment the GC procured on that CO.
   - The card shows the basis: `Cost $X + 15% = $Y to owner`.

2. **Approval asks the owner question**
   - When the GC approves a CO, the approve dialog gains a required step:
     - "Pass this cost to the owner?" Yes / No.
     - If Yes: markup % input (pre-filled from org default if present), live preview of cost → owner price, editable owner price override.
     - If No: short reason note, and the CO is flagged as absorbed.
   - Approving with Yes writes the owner price + markup % onto the CO, so it immediately counts as owner revenue.

3. **Owner contract updates**
   - Revised owner contract = original owner contract value + Σ owner prices of approved, passed-through COs. This is what the owner budget card and the CO Revenue & Markup card headline.
   - COs marked "not passed to owner" stay out of owner revenue and appear in the existing red **"you eat it"** list with their absorbed cost total.

4. **Editable after approval**
   - The GC can still change the markup %, owner price, or the pass-through flag after approval; the owner contract total and markup % recalculate.

## Technical notes

- Migration on `public.change_orders`:
  - `gc_owner_markup_percent numeric` — GC markup applied to GC cost.
  - `passed_to_owner boolean default null` — null = undecided, true = billable to owner, false = absorbed.
  - `not_passed_reason text`.
  - Keep `gc_budget` as the stored owner price (single source of truth for owner revenue); relabel in UI only, no data migration needed.
  - Backfill: existing COs with `gc_budget > 0` get `passed_to_owner = true`.
- `src/components/change-orders/COKPIStrip.tsx`: relabel the tile, add markup-% input alongside the amount input, compute owner price from GC cost, show the formula sub-line.
- `src/components/change-orders/COStatusActions.tsx`: extend the GC approve dialog with the pass-through/markup step; write `gc_budget`, `gc_owner_markup_percent`, `passed_to_owner` in the same update as the approval, and log it to `co_activity` / audit.
- `src/hooks/coAggregation.ts`: GC branch counts owner revenue only when `passed_to_owner !== false` and `gc_budget > 0`; absorbed COs accumulate into `coMissingOwnerBudget`-style "absorbed" bucket.
- `src/components/project/GCProjectOverviewContent.tsx`: relabel owner-price columns, split the unpriced list into "undecided" vs "absorbed by you".
- `src/components/change-orders/COAuditLog.tsx`: friendly labels for the new fields; keep them GC-internal (never visible to TC/FC).
- Tests: extend `src/test/coAggregation.test.ts` for passed-through, absorbed, and undecided COs.
