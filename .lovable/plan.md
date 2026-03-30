

# Allow Editing SOV Amount (+ Auto-Redistribute Percentages)

## What
Currently users can only edit the **%** column. This adds the ability to also edit the **Value ($)** column and the **Line Item name**. When a user edits the dollar amount, the percentage auto-recalculates based on contract value, and all other unlocked lines redistribute to keep the total at 100%.

## Changes

### 1. `src/hooks/useSOVPage.ts` — Add `updateLineAmount` function

New callback that:
- Takes `lineId` and `newAmount` (dollar value)
- Converts to percentage: `newPct = (newAmount / contractValue) * 100`
- Delegates to existing `updateLinePct(lineId, newPct)` — reuses all redistribution logic

Also add `updateLineName` callback:
- Takes `lineId` and `newName`
- Updates `item_name` on `project_sov_items` via Supabase
- Invalidates query cache

Return both new functions from the hook.

### 2. `src/pages/ProjectSOVPage.tsx` — Editable Value and Name columns

**Value column (lines ~312-314):**
- Add same click-to-edit pattern as % column
- New state: `editingAmountId`, `editingAmount`
- On save, call `updateLineAmount(lineId, parsedAmount)`
- Show inline `<Input type="number">` when editing

**Name column (line ~285):**
- Add click-to-edit for the item name
- New state: `editingNameId`, `editingName`
- On save, call `updateLineName(lineId, newName)`

**% column (existing):**
- Already works — no changes needed. The existing redistribution logic in `updateLinePct` already auto-adjusts all other unlocked lines to sum to 100%.

### Files Changed
- `src/hooks/useSOVPage.ts` — add `updateLineAmount`, `updateLineName`
- `src/pages/ProjectSOVPage.tsx` — editable Value and Name cells

