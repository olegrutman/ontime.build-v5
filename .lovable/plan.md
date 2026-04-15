

# Fix: "Rendered more hooks than during the previous render" in StepCatalog

## Root Cause
The `useMemo` for `smartSuggestionItems` (line 214) is placed **after** three early returns:
- Line 143: `isLoading` early return
- Line 148: `phase === 'location'` early return  
- Line 166: `phase === 'reason'` early return

When the user progresses from location → reason → items, React encounters a new `useMemo` hook that didn't exist in prior renders, causing the crash.

## Fix

**File: `src/components/change-orders/wizard/StepCatalog.tsx`**

Move the `smartSuggestionItems` `useMemo` (lines 214-235) to **before** the early returns — place it right after the `searchResults` useMemo (after line 93), alongside all other hooks. The hook body already handles the case where `data.reason` or `workType` is missing by returning `[]`.

One change, one file. The hook logic itself is correct — it just needs to be repositioned above the early returns so it's always called regardless of render path.

