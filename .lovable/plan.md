# Fix Per-Pack Variance card on mobile

The card currently uses a 6-column table with `minWidth: 560` inside a horizontal scroller. On a 390px screen this shows only the "Pack" name column — all the numbers (Estimate, Ordered, Delivered, Variance, Status) are scrolled off-screen with no visible scroll cue.

## Fix

Replace the table on mobile with a stacked card layout per pack. Keep the table on desktop (`sm:` and up).

### Mobile layout (per pack)
Each pack becomes a row block:
```
┌──────────────────────────────────────┐
│ Basement Framing            [OK]    │  ← name + status pill
│ Est $12.4K  Ord $11.8K  Del $9.2K   │  ← 3 mono numbers
│ Variance  -$0.6K (-4.8%)            │  ← variance line, colored
└──────────────────────────────────────┘
```

- Pack name + status pill on the top row (space-between)
- A compact 3-cell grid (`grid-cols-3 gap-2`) showing Estimate / Ordered / Delivered with tiny uppercase labels above each value
- Variance line below in red/amber/green based on status
- Tappable (same `onClick={() => onNavigate('purchase-orders')}`)
- Divided by a hairline border between packs

### Desktop layout
- Keep the existing `<table>` exactly as-is, hidden on mobile via `hidden sm:block` wrapper
- Remove the `minWidth: 560` since it's no longer needed inside `overflow-x-auto`

### Implementation detail
In `src/components/project/BuyerMaterialsAnalyticsSection.tsx`, replace the single `overflow-x-auto > table` block (lines 308-332) with two siblings:
1. `<div className="sm:hidden divide-y">` — mobile card list
2. `<div className="hidden sm:block">` — existing table

No business logic, no math, no data shape changes.

## Files Edited
- `src/components/project/BuyerMaterialsAnalyticsSection.tsx`

## Out of Scope
- KPI card tables elsewhere (Owner Budget, TC Contract, etc.) — those are inside expandable cards and the horizontal scroll works there since they're opt-in. If you also want those converted to stacked mobile cards, say the word and I'll do them in a follow-up.
