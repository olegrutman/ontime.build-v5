# Fix: combined item missing AI description

## What's happening

In the CO wizard Review step, when items are combined into one synthetic row, the textarea for that combined item ends up **empty**, and on save its `co_line_items.description` is stored as `null`. The CO detail page then shows the combined row with no description.

Three weak spots cause this:

1. **`generateAIDescription` writes the entire `itemDescriptions` map.** If two regen calls overlap (the auto-trigger when entering Review fires for the *pre-combine* item IDs, then `Combine` triggers a second regen for the combined ID), the first one returning later overwrites the second — and its IDs no longer exist in `selectedItems`.
2. **The AI may return `description: ""`** for the combined item (or omit it). The current per-item fallback inside the edge function only fires per missing id, but if the model returns the id with an empty string, `byId.get(id) || fallback` does fall through — so this path is fine. The real risk is the client-side overlap above clobbering the good result.
3. **No client-side safety net at save time.** If `itemDescriptions[combinedId]` is missing/empty, we save `null` instead of synthesizing a description from the bundled sub-items.

## Fix (3 small, targeted changes — all in `src/components/change-orders/wizard/COWizard.tsx`)

### 1. Make `generateAIDescription` race-safe

- Capture the `selectedItems` snapshot used to build the request.
- After the call returns, **only merge** results for IDs that still exist in the *current* `data.selectedItems`. Drop stale IDs.
- Use a functional `update` that merges into the existing `itemDescriptions` rather than replacing it wholesale, so a late-arriving stale response can't wipe a fresh combined-item description.
- Bump a local `requestSeq` ref; ignore responses whose seq is not the latest.

### 2. Always seed a description for combined items immediately on combine

In `CombineButton.doCombine`, before calling `onAfterCombine`, set a deterministic local description for the new combined id (same format as the existing fallback in `generateAIDescription`'s catch block):

```
Combined scope at {locationTag} — {intentLabel}, covering N related items.
• item A (qty unit)
• item B (qty unit)
• item C
```

That way the textarea is never empty even for a split-second, and if AI regen fails or is slow, the user still sees a meaningful description. AI regen still runs and overwrites with the polished version when it returns (and survives the race fix from #1).

### 3. Save-time safety net

In `handleSubmit`, when building the `co_line_items` insert rows, if `description` resolves to falsy AND the item `isCombined` with `combinedFrom`, synthesize the same bullet-list description as a last-resort instead of inserting `null`.

### 4. Re-trigger auto-regen when entering Review even if `aiDescription` already exists

`handleNext` currently guards with `&& !data.aiDescription`. Remove that guard so re-entering Review (after a Back+combine) always regenerates per-item descriptions for the *current* item set. (Cheap; user can still edit freely afterwards.)

## Files touched

- `src/components/change-orders/wizard/COWizard.tsx` — only file.
- No DB changes, no edge function changes (the function already handles combined items correctly).

## Result

- Combined items always show a full description (bullet list of sub-items + location + intent), generated locally on combine and upgraded by AI when it returns.
- Race conditions between overlapping regen calls can no longer wipe the combined item's description.
- Even if AI fails entirely, `co_line_items.description` is never null for a combined row.
