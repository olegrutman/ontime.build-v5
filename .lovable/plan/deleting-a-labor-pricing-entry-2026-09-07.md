# Deleting a labor/pricing entry

## What's happening now

- The entry form requires real numbers before it will save: zero hours, zero rate or a zero lump sum all trigger "Enter hours greater than zero" and the Update button stays disabled. So "zero it out" can never work — by design, and it should stay that way.
- A delete action already exists behind the scenes (`deleteLaborEntry` in `useChangeOrderDetail`), but nothing in the interface calls it. That's the actual gap: there is no button anywhere to remove an entry.

## Proposed approach

1. **Remove button inside the open entry (editing only)**
   In `LaborEntryForm.tsx`, when an existing entry is open for editing, add a quiet "Remove entry" text button on the left of the footer, next to Cancel. Not shown when adding a new entry.

2. **Swipe/row-level remove in the list**
   In `COLineItemRow.tsx`, each saved entry row gets a small trash icon (appears on hover on desktop, always visible on mobile) so a line can be removed without opening it.

3. **One confirmation step**
   A short confirm dialog: "Remove this entry? $X,XXX will come off the work order total." Confirm removes, toast confirms, totals refresh through the existing invalidation.

4. **Who is allowed to remove, and when**
   - Only the org that entered the line can remove it (a GC can't delete a TC's line, a TC can't delete a field crew's line).
   - Allowed while the work order is still open for pricing (draft / shared / work in progress / closed for pricing).
   - Once it's submitted, approved or contracted, the amounts are part of an agreed number — removal is blocked with a short note explaining a change is needed instead.

5. **Keep imported field hours honest**
   If the removed line was built from imported field crew hours, clear its import tags so those same hours can be imported again later instead of being permanently consumed.

6. **Proof before I call it done**
   - Confirm the database rules actually allow the correct party to delete and block the wrong one.
   - Delete an entry as a TC and as a field crew user, and check the work order total on screen matches the stored total.
   - A regression test covering: remove allowed while pricing, blocked after approval, other-org line not removable, and totals recomputed.

## Technical notes

- `LaborEntryForm.tsx`: add `onDelete` prop; render only when `isEditing`.
- `COLineItemRow.tsx`: wire the row trash icon to `deleteLaborEntry` from `useChangeOrderDetail`.
- Guard by `entry.org_id === myOrgId` plus the CO status list above; verify a DELETE policy on `co_labor_entries` exists and is scoped to the entering org (add one in a migration if it is missing or too broad).
- Reset `source_fc_entry_ids` bookkeeping on delete so re-import stays possible.
