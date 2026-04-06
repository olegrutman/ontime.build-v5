

# Add Editable Owner Budget to Owner Budget Card

## What's Changing

The Owner Budget card (Card 1) in `GCProjectOverviewContent` currently displays the value read-only. This change adds an inline editable field so the GC can set or update the owner contract value directly from the card, using the existing `updateOwnerContract` function from `useProjectFinancials`.

## Changes

### File: `src/components/project/GCProjectOverviewContent.tsx`

1. **Add owner budget draft state** — new `useState` for `draftOwnerBudget` initialized from `financials.ownerContractValue`, plus a `dirtyOwner` flag

2. **Add EditField for Owner Contract Value** inside Card 1's expand body — replace the static "Owner Contract Value" row with an inline editable field (same pencil-to-edit pattern as the TC Contract card), plus a "Save Owner Budget" button when dirty

3. **Wire save to `financials.updateOwnerContract`** — on save, call `financials.updateOwnerContract(upContract.id, newValue)` then `financials.refetch()` and clear dirty flag

4. **Use `draftOwnerBudget`** for live margin calculations so the card header value and margin cards update as the user types

### Card 1 Expand Body (new layout)

```
┌─────────────────────────────────────┐
│ Owner Contract Value  $420,000  ✏️  │  ← EditField, editable
│ Approved COs to Owner    +$10,200  │
│ Revised Contract Total   $430,200  │  ← total row
│ ─────────────────────────────────── │
│ Invoiced to Date         $168,400  │
│ Remaining                $261,800  │
│                                     │
│ [████ Save Owner Budget ████]       │  ← only when dirty
│ 🟠 Unsaved changes                  │
└─────────────────────────────────────┘
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/project/GCProjectOverviewContent.tsx` | Add editable owner budget field + save logic in Card 1 |

### What is NOT changing
- Database schema (already has `owner_contract_value` column)
- `useProjectFinancials` hook (already exposes `updateOwnerContract`)
- Other cards or pages

