
## Goal

Stop the CO detail header from repeating itself, and make each scope item the most visible thing on the page — since the meaningful "why / where / what" now lives per item.

## Header changes (`COHeroBlock.tsx` / hero area of `CODetailLayout.tsx`)

Before (top of card):
```text
CO-MAI-GC-TC-0009                                        [GC avatar]
CO-MAI-GC-TC-0009 · Apr 27, 2026
📍 Exterior · Roof system / Roof sheathing · Roof   Addition   📅 Apr 27, 2026   Draft
```

After:
```text
CO-MAI-GC-TC-0009                            Draft       [GC avatar]
```

Concretely:
- Remove the small mono `co_number` label that sits above the title.
- Remove the date suffix and the user-typed name from the big title line. The big line is just the CO number, in Barlow Condensed bold, larger size than today (bump from current ~text-2xl/3xl to text-3xl/4xl).
- Remove the location chip, reason chip, and date chip from the header entirely. These are now per-item concerns.
- Keep the status pill (`Draft` / `Submitted` / etc.) — it's lifecycle, not duplication. Move it inline next to the CO number instead of in the chip row.
- Keep the org/avatar block on the right.
- Optional name (`coName`) the user typed in the wizard: show as a quiet subtitle under the CO number only if non-empty, smaller and muted. If empty, render nothing (no date fallback).

## Scope item promotion (`COLineItemRow.tsx`)

Today the item name renders at roughly `text-sm font-medium`. Bump it so it reads as the page's primary content:

- Item name: `font-display` (Barlow Condensed) `text-lg` `font-semibold` `tracking-tight`, dark foreground.
- Per-item description: keep current size (`text-sm text-muted-foreground`), sits directly under the name.
- The location chip, reason chip, unit chip row stays where it is below the description — these are the per-item context that replaces what we removed from the header.
- Slightly increase row vertical padding so each item reads as its own card-like block instead of a dense list row.

## Files to touch

- `src/components/change-orders/COHeroBlock.tsx` — strip duplicate CO#, date, location chip, reason chip; enlarge CO# typography; inline status pill.
- `src/components/change-orders/CODetailLayout.tsx` — only if the chip row / subtitle is rendered here rather than in the hero block (will confirm on read).
- `src/components/change-orders/COLineItemRow.tsx` — promote item name typography, give the row more breathing room.

No data model, wizard, or edge function changes. Purely presentational cleanup of the detail page.

## Out of scope

- The wizard itself (already updated last round to write per-item Why/Where/What).
- The board / list views of COs.
- The financial KPI strip and Actions panel — untouched.
