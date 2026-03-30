

# Fix: Add Auto-Redistribution to ContractSOVEditor

## Problem
When editing a percentage or dollar amount in the active SOV editor (`ContractSOVEditor`), only the edited line is updated. **Other lines are not adjusted**, so the total drifts away from 100%. The redistribution logic exists in the legacy `useSOVPage.ts` hook but was never ported to `useContractSOV.ts`.

## Root Cause
`updateItemPercent` in `useContractSOV.ts` (line 812-855) only updates the single item — no redistribution pass runs.

## Fix

### `src/hooks/useContractSOV.ts` — Add redistribution to `updateItemPercent`

After updating the edited line, redistribute the delta across all other unlocked items in the same SOV:

1. Calculate `delta = newPercent - oldPercent`
2. Get all other unlocked items for that SOV from `sovItems[sovId]`
3. Proportionally subtract `delta` from each unlocked item (weighted by its current %)
4. Clamp negatives to 0, redistribute clamped excess to remaining positive lines
5. Force last unlocked line to absorb rounding remainder so total = 100%
6. Batch-update all adjusted items via the existing `update_sov_line_percentages` RPC (already used in `useSOVPage.ts`)
7. Update local state for all affected items

This mirrors the proven logic from `useSOVPage.ts` `updateLinePct` (lines 141-180).

### No UI changes needed
The `ContractSOVEditor` already has inline editing for %, $, and name. Only the backend logic is broken.

### Files Changed
- `src/hooks/useContractSOV.ts` — rewrite `updateItemPercent` to include redistribution

