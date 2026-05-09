# Fix: FC (and TC) can't easily move a CO from `draft` to `submitted`

## Why this is broken today

The DB and permission layer already allow it. `COStatusActions.canSubmit` evaluates true for an FC creator on a `draft` CO whose `assigned_to_org_id` (upstream TC) is set, and `handleAction('submit')` in `CODetailLayout.tsx` already calls `submitCO.mutateAsync`. So the route works.

What's missing is **discoverability in the UI**:

`CONextActionBanner.tsx` (lines 98–108) — for TC/FC on `status === 'draft'` the banner only shows:
- Primary: **Log Hours**
- Secondary: **Add Materials**

There is **no Submit button** on the banner until status reaches `closed_for_pricing` (TC flow) or the user scrolls all the way down to `COStatusActions` and finds the "Submit for Approval" button.

Same gap exists on `shared` / `work_in_progress` for FC (no GC step in between, so the user gets stuck looking for a way to send it upstream).

## Fix

Update `getBannerConfig` in `src/components/change-orders/CONextActionBanner.tsx` for the TC/FC branch only:

1. **Draft / Shared / Work-in-progress** — append a tertiary action `{ label: 'Submit to {upstream}', action: 'submit' }`. Keep `Log Hours` as primary so the "build first" guidance stays, but make Submit always reachable in one click.
2. Gate the Submit action on `co.assigned_to_org_id` being set; if missing, replace it with a disabled-style `Assign {upstream}` hint (no action) so the user knows why it's hidden. (Assignment is normally auto-set by the picker, so this is just defensive.)
3. No change for GC, no change for the existing `closed_for_pricing` and `submitted` banners.

The `'submit'` action is already wired in `CODetailLayout.handleAction` (line 237) — it runs `submitCO.mutateAsync`, plus the existing RFI/photo guards. No other code changes needed.

## Files to change

- `src/components/change-orders/CONextActionBanner.tsx` — TC/FC `draft` / `shared` / `work_in_progress` blocks only.

## Out of scope

- No DB, RLS, or hook changes.
- No changes to `COStatusActions` (its Submit button stays as the canonical control).
- No GC banner changes.
