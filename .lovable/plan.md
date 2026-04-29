## Problem

On this CO (status `draft`, pricing_type `nte`), the TC cannot edit either external (billable) or internal (cost) inputs on line items, materials, or equipment — even though nothing has been submitted.

Root cause is in `useCORoleContext.ts`:

```ts
const tcFrozen = co?.tc_submitted_price != null;
const fcFrozen = co?.fc_pricing_submitted_at != null;
const externalFrozenForRole =
  isFC ? (fcFrozen || submittedOrFinal)
  : isTC ? (tcFrozen || submittedOrFinal)
  : submittedOrFinal;
```

The flag treats the **mere presence** of `tc_submitted_price` as a "TC has frozen pricing" signal. But that column is also written **during draft** by:

- `FCPricingToggleCard` — every time the calculated FC base price changes (writes `tc_submitted_price`), and
- `COStatusActions` — at submission time.

So as soon as the FC pricing toggle is on (or any prior write happened), the TC's external edits get locked even though the CO is still `draft`. The same shape applies to FC via `fc_pricing_submitted_at`.

This cascades through:
- `COLineItemRow` → `canEditHeader`, `canEditEntry` (billable rows)
- `COMaterialsPanel` → `matRowEditable` per row
- `COEquipmentPanel` → `rowEditable` per row

Internal-cost editing also breaks because internal cost rows in `COLineItemRow.canEditEntry` only depend on `canEditInternal`, which is tied to status — that part is correct. The visible TC pain is the external lock; once we fix it, both sides will behave.

## Fix

In `src/hooks/useCORoleContext.ts`, decouple the per-party freeze from the snapshot price columns. The freeze should be driven by **status** (and, for FC, the explicit FC pricing submission flag, which is set on a deliberate user action, not a recompute).

```ts
// External edits lock when the CO is sent upstream (submitted) or is final.
const externalFrozenForRole =
  isFC ? (fcFrozen || submittedOrFinal)   // FC: their explicit pricing submission still freezes them
  : submittedOrFinal;                      // TC & GC: only status drives the lock
```

Rationale:
- `tc_submitted_price` is a derived/snapshot value, not a "TC submitted" event marker. Use status (`submitted` / final) instead.
- `fc_pricing_submitted_at` is set by an explicit FC action ("Submit pricing"), so keeping it as a freeze for FC is intentional.
- GC remains driven by status only (already the case).

No other files need to change — the panels already consume `canEditExternal` / `canEditInternal` correctly, and row-level `org_id === myOrgId` guards still prevent cross-org edits.

## Verification

1. Open the same CO (draft, TC org). Confirm:
   - Line item header edit popover opens for items owned by TC.
   - Billable hours / pricing entries on TC's items are editable.
   - Materials and Equipment rows owned by TC show the pencil and open inline edit.
   - Internal cost (actuals) entries remain editable (unchanged).
2. Submit the CO upstream → all external edits lock; internal cost edits still allowed.
3. Approve / reject / contracted → both external and internal locked.
4. As FC: confirm "Submit pricing" still freezes FC external edits even before status changes.

## Files

- `src/hooks/useCORoleContext.ts` — single change to `externalFrozenForRole`.
