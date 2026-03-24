

# Fix: Add FC Pricing Toggle to CO Slide-Over Panel

## Problem
The TC Pricing tab in the slide-over panel shows only static financial rows ("Billable to GC", "Total") but is missing the **FC Pricing Toggle** — the switch that lets TC use FC hours/lump sum as their pricing base. The role banner says "Toggle below to use as your base" but the toggle doesn't exist in the slide-over.

## Root Cause
The `FCPricingToggleCard` component is defined inside `CODetailPage.tsx` (the old full-page detail view) and was never imported into `COSlideOver.tsx`.

## Fix
In `COSlideOver.tsx`, add the `FCPricingToggleCard` to the TC section of the Pricing tab (before the financial summary rows). The component needs:
- `co`, `financials`, `myOrgId`, `onRefresh` — all already available in the slide-over
- `fcCollabName` — derived from `collaborators` (the active FC collaborator's org name)
- `gcSideName` — derived from the CO's org name or "GC"

**Steps:**
1. Extract `FCPricingToggleCard` from `CODetailPage.tsx` into its own file `src/components/change-orders/FCPricingToggleCard.tsx` so both views can use it
2. Import and render it in `COSlideOver.tsx` inside the TC pricing section, gated on `isTC && collaborators.length > 0`
3. Import it in `CODetailPage.tsx` from the new file location

| File | Change |
|------|--------|
| `src/components/change-orders/FCPricingToggleCard.tsx` | New file — extracted component |
| `src/components/change-orders/COSlideOver.tsx` | Import + render toggle in TC pricing tab |
| `src/components/change-orders/CODetailPage.tsx` | Import from new file instead of inline definition |

