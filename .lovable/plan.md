## Bug: FC "Submit to Trade Contractor" button does nothing

### What's happening
On CO `CO-FUL-IM-HA-0002` (status `draft`, owned by TC, with the FC as an active collaborator), the next-action banner shows **Submit to Trade Contractor** for the FC. Clicking it fires the banner action `'submit'`, which in `CODetailLayout.handleAction` calls `submitCO.mutateAsync(co.id)`. That mutation does:

```
UPDATE change_orders SET status='submitted' WHERE id = ...
```

Two problems:

1. **Wrong semantics.** The FC is a *collaborator*, not the CO owner. Collaborators submit their input via the `complete_fc_change_order_input` RPC (the existing `'submit_to_tc'` action in `CODetailLayout`), not by flipping the whole CO to `submitted`. The latter is what the TC does after receiving FC input.
2. **Blocked by RLS / business rules.** Updating a TC-owned `change_orders` row from an FC org is rejected by row-level security, so the click silently fails (or surfaces a generic error toast).

The recent edit that added `submitAction` to the draft / shared / WIP banners (in `CONextActionBanner.tsx`) used `action: 'submit'` for both TC and FC. That's correct for an FC who *owns* the CO (`created_by_role='FC'` and `org_id = myOrgId`), but wrong for an FC collaborator on a TC-owned CO — which is the most common FC scenario.

### Fix

Route the banner's submit button to the right handler based on whether the FC is the owner or a collaborator.

**1. `CONextActionBanner.tsx`**
- Accept a new prop `isFCCollaborator: boolean` (FC viewer + active collaborator row exists, CO not owned by FC org).
- When building `submitAction`:
  - If `isFC && isFCCollaborator` → `{ label: 'Submit to {TC}', action: 'submit_to_tc' }`.
  - Else (TC or FC owner) → existing `{ action: 'submit' }`.
- Keep the existing `canSubmitNow = !!co.assigned_to_org_id` guard for TC; for FC collaborator the guard is "active collaborator row exists" (already true if `isFCCollaborator`).

**2. `CODetailLayout.tsx`**
- Compute `isFCCollaborator` from existing data (`isFC && isActiveCollaborator && co.org_id !== myOrgId`) and pass it to `CONextActionBanner` (both render sites: line 404 and the sticky-footer pass at 642 — verify `COStickyFooter` reuses the same banner config; if so pass it there too).
- No change to `handleAction` needed — `'submit_to_tc'` already calls `completeFCInput` / `submitCO` correctly based on `isFCCreator`.

**3. `COStatusActions.tsx`** — no change needed; the existing `canSubmitFCPricing` path is for the `closed_for_pricing` status and is unrelated.

### Verification
- As the FC collaborator on `CO-FUL-IM-HA-0002` (draft), click **Submit to Trade Contractor**: collaborator row flips to `completed`, `co_activity` gets an `fc_input_completed` entry, success toast appears, CO status stays `draft` (TC will submit the actual CO).
- As an FC who *owns* a CO (`created_by_role='FC'`, `org_id = myOrgId`): button still calls `submitCO` and flips status to `submitted`.
- TC submit flow unchanged.

### Files touched
- `src/components/change-orders/CONextActionBanner.tsx`
- `src/components/change-orders/CODetailLayout.tsx`
- (possibly) `src/components/change-orders/COStickyFooter.tsx` if it forwards `isFCCollaborator`
