# Margin KPI: include the supplier material contract

Yes — I agree. The header already treats the approved supplier estimate as the material contract, but the "Your Margin" KPI card still only subtracts the subcontract. That's why the card shows a healthy margin while the header shows a loss on the same project. One project, one margin number.

## The rule

Margin = (owner contract + approved CO revenue) − (subcontract + approved CO cost + material contract).

Material contract = the approved supplier estimate total, counted only for the party responsible for materials (GC or TC). If no estimate is approved yet, fall back to committed purchase orders so the card is never blind to real spend — labeled so it's obvious which one is in play.

## What the card will show

- Headline: total margin including materials, with the % against revised-in (same math as the health hero).
- Breakdown rows, in cost order:
  - Owner Budget
  - Subcontract ({TC})
  - Materials contract (approved supplier estimate) — or "Committed POs (no approved estimate)"
  - CO Revenue / CO Cost / CO Net
  - Your Total Margin (total row)
  - Then delivery reality: Ordered against material contract, Delivered, Pending delivery, and Material variance (contract − ordered)
- Pill thresholds keyed off the new margin % so a red project reads red.
- Small note when materials belong to the TC: "Materials procured by {TC} — inside their subcontract", and materials are excluded from the GC cost side in that case (no double count).

## Delivery consideration

Undelivered material is exposure, not yet cost. The card will surface it as a separate "at risk on delivery" line (pending delivery + any ordered-over-contract overage) rather than folding it into margin, so margin stays contractual and the risk is still visible.

## Scope

- GC project overview: "Your Margin" card and its live-edit twin (both use the same numbers so contract edits preview correctly).
- TC project overview: same treatment where the TC owns materials.
- Health hero, summary strip, and the margin card all read one shared computation so they cannot drift apart again.

## Technical notes

- Reuse `financials.isGCMaterialResponsible`, `matEstimate`, `matOrdered`, `matDelivered`, `matPending` already available in `GCProjectOverviewContent.tsx`; no new queries.
- Lift the header's `materialCommitment` / `revisedIn` / `revisedOut` / `projectedMargin` calc out of the inline IIFE into one memo at component scope, then feed hero, summary strip, and margin card from it.
- Presentation-only change plus that shared memo — no database, RLS, or hook changes.
- Verify in the browser as GC and TC on Main Street Apartments and report the numbers.
