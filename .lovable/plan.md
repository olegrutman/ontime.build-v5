

# Fix: FC Submit to TC + Close for Pricing + End-to-End CO Flow

## Problems Found

### Bug 1: "Submit to TC" does nothing (FC)
The `submit_to_tc` action fires from the sticky footer and the banner, but `handleAction()` has no case for it. It falls through to the default `scrollTo(top)`. The mutation `completeFCInput` already exists and calls the `complete_fc_change_order_input` RPC correctly.

### Bug 2: "Close for Pricing" does nothing (GC)
The `close_for_pricing` action fires from the banner and hero block but is not handled in `handleAction()`. There is also no mutation for it in `useChangeOrderDetail.ts` — we need to add one.

### Bug 3: TC doesn't see FC accepted
This actually works once `completeFCInput` executes (it sets collaborator status to `completed` and `fc_input_needed = false`). The problem is Bug 1 — FC can never submit, so the status never changes.

## Changes

### 1. `src/hooks/useChangeOrderDetail.ts` — Add `closeForPricing` mutation

Add a new mutation that updates the CO status to `closed_for_pricing` and sets `closed_for_pricing_at`. Also add an activity log entry. Export it alongside other mutations.

### 2. `src/components/change-orders/CODetailLayout.tsx` — Wire up missing actions

Add cases to `handleAction()`:

- **`submit_to_tc`**: Call `completeFCInput.mutateAsync()` then show success toast "Submitted to Trade Contractor"
- **`close_for_pricing`**: Call `closeForPricing.mutateAsync(co.id)` then show success toast "Closed for pricing"

Also destructure `closeForPricing` from the hook.

### 3. `src/components/change-orders/COStickyFooter.tsx` — No changes needed
Already fires the correct action strings.

## Files Changed
- `src/hooks/useChangeOrderDetail.ts` — add `closeForPricing` mutation (~15 lines), export it
- `src/components/change-orders/CODetailLayout.tsx` — add `submit_to_tc` and `close_for_pricing` cases (~15 lines), destructure `closeForPricing`

## What stays the same
- Database RPCs — `complete_fc_change_order_input` already works correctly
- `CONextActionBanner.tsx`, `COStickyFooter.tsx`, `COHeroBlock.tsx` — already fire correct action strings
- RLS policies — no changes needed
- `useCORoleContext.ts` — no changes needed

