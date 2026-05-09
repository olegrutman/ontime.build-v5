# Fix: FC sees TC's price-to-GC ($390) leaking into FC views

## What's actually happening

This CO (`f9865ab8…`) is owned by a **TC org** (Pacifico — actually the FC is the *collaborator*, the CO owner is the TC org `12ba4ad9`). DB state:

- TC labor entry: `lump_sum = 390` (TC's price to GC)
- FC labor entry: `lump_sum = 210` (FC's price to TC)
- 0 materials, 0 equipment
- FC org is an `active` collaborator on the TC's CO

`useChangeOrderDetail.ts` computes financials **globally** (no viewer scoping):
```ts
tcBillableToGC = tcLaborTotal             // 390
grandTotal     = tcBillableToGC + mats + eq  // 390
fcLaborTotal   = sum of FC entries          // 210
materialsTotal = sum of ALL materials       // global
equipmentTotal = sum of ALL equipment       // global
```

The FC user sees the TC's `$390` because two consumers feed `grandTotal` straight into FC-facing UI:

1. **`CODetailLayout.tsx:315`** — `displayBillable = (isTC || isFC) ? financials.grandTotal : totalLogged` → strip shows **Billable to TC = $390** (TC's price to GC). Margin row then shows **$390 / 100%**, both wrong and a privacy leak.

2. **`COSidebar.tsx:117 / 186`** — Financials block shows **Total to TC = `financials.grandTotal` = $390**, while the "Billable to TC" line just above it shows the correct `$210` (`ownLabor`). Same component prints two contradictory "to TC" values.

3. **`COSidebar.tsx:60–63`** — FC profitability uses `materialsTotal + equipmentTotal` **globally**, so once a TC adds any materials, FC's revenue inflates by them.

KPI strip (`COKPIStrip.tsx:150–214`) is already correct for FC — it builds `totalToUpstream = fcLaborTotal + (FC-resp mats/eq)` itself. That's the pattern to copy into the other consumers.

RLS on `co_labor_entries` (`can_see_co_labor_entry`) only blocks `is_actual_cost` cross-org — TC's billable lump-sum entry is readable by FC by design. So the fix is in the financials/UI layer, not RLS.

## The fix

### A. Add a viewer-scoped derived view in `useChangeOrderDetail.ts`

Extend the returned `financials` with a viewer-scoped block computed from the existing data + `currentOrgId`:

```ts
// In the financials object:
viewer: {
  // FC viewer: own labor + materials/equipment they procure
  // TC viewer: tcBillableToGC + materials/equipment they procure
  ownLaborToUpstream: number,    // FC: fcLaborTotal | TC: tcBillableToGC
  ownMaterialsTotal: number,     // sum where material.org_id === currentOrgId
  ownEquipmentTotal: number,     // sum where equipment.org_id === currentOrgId
  ownMaterialsCost: number,      // same filter, on .line_cost
  ownEquipmentCost: number,
  totalToUpstream: number,       // ownLabor + ownMaterials + ownEquipment
}
```

Materials/equipment scoping uses `org_id` already on `co_material_items` / `co_equipment_items` (matches the KPI strip's existing `matResp/eqResp` pattern). Pass `currentOrgId` into the hook (or compute downstream from the same source) so the same numbers feed every component.

GC viewer keeps using `grandTotal` (it's the GC's total). TC owner viewer's `totalToUpstream` equals today's `grandTotal`. FC collaborator viewer's `totalToUpstream` equals `fcLaborTotal + FC-procured`.

### B. Use the scoped numbers in the leaking spots

- **`CODetailLayout.tsx:315–317`** — replace `(isTC || isFC) ? financials.grandTotal : totalLogged` with `(isTC || isFC) ? financials.viewer.totalToUpstream : totalLogged`. Margin recomputes off that.
- **`CODetailLayout.tsx:452–454`** — keep label "Billable to TC" / "Billable to GC" but feed it the scoped value.
- **`COSidebar.tsx:117, 145, 186, 215`** — Total line uses `viewer.totalToUpstream`; tax line uses `viewer.totalToUpstream + tax` (recompute tax base on the scoped number, not on the global `grandTotalWithTax`).
- **`COSidebar.tsx:60–63`** (FC profitability) — `revenue = viewer.totalToUpstream`; `costs = financials.fcLaborTotal + viewer.ownMaterialsCost + viewer.ownEquipmentCost`.
- **`COKPIStrip.tsx:152–156`** — already does the right thing manually; switch it to read the same `viewer.*` fields so all three components share one source of truth.

### C. Status-actions submit amount

`COStatusActions.tsx:92` `submitAmount = financials?.grandTotal ?? 0` — for FC submitter this currently submits `$390`, the TC's number. Switch to `financials.viewer.totalToUpstream`. (TC keeps its current value, since for TC the scoped total equals grandTotal.)

## What this does NOT change

- No DB schema, RLS, or trigger changes. The `co_labor_entries` RLS already permits the read; scoping is a UI/derivation concern.
- GC view unchanged.
- TC owner view unchanged numerically (the scoped total equals `grandTotal` for the owner of the CO).

## Files

- `src/hooks/useChangeOrderDetail.ts` — add `viewer` block to financials, accept `currentOrgId` (already available via `useUserContext`)
- `src/types/changeOrder.ts` — extend `COFinancials` type with `viewer`
- `src/components/change-orders/CODetailLayout.tsx` — use `viewer.totalToUpstream`
- `src/components/change-orders/COSidebar.tsx` — use `viewer.*` for Total, Tax, FC profitability
- `src/components/change-orders/COKPIStrip.tsx` — read same `viewer.*` fields (consolidation, not behavior change)
- `src/components/change-orders/COStatusActions.tsx` — submit amount uses `viewer.totalToUpstream`

## Acceptance check on this CO after fix

For the FC user on `f9865ab8…`:
- Scope & Labor strip "Billable to TC" → **$210** (not $390)
- Margin row → **$210 / 100%**
- Sidebar "Total to TC" → **$210**
- KPI "Total to TC" → **$210** (already correct, will stay)
- Submit button amount → **$210**

The TC owner's view of the same CO shows **$390** in all the same places.
