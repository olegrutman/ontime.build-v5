

# Fix: Add Dollar Amount Inline Editing to ContractSOVEditor

## Problem Found
The dollar amount editing was implemented in `src/pages/ProjectSOVPage.tsx` (legacy SOV page), but the **actual component in use** is `src/components/sov/ContractSOVEditor.tsx`. This component renders on the project SOV tab via `ProjectHome.tsx`. It currently has name and percentage inline editing but **no dollar amount editing**.

## Test Results
- **Name editing**: Works — clicking the pencil icon opens an inline input field
- **Percentage editing**: Works — clicking the pencil icon opens an inline input with confirm/cancel
- **Dollar amount editing**: Missing — the `$1,960` value is a static, non-clickable span

## Plan

### 1. `src/hooks/useContractSOV.ts` — Add `updateItemAmount`

Add a new function that:
- Takes `sovId`, `itemId`, `newAmount` (dollar value)
- Looks up the contract value for that SOV
- Converts amount to percentage: `(newAmount / contractValue) * 100`
- Delegates to existing `updateItemPercent(sovId, itemId, newPct)` — reuses all redistribution logic

### 2. `src/components/sov/ContractSOVEditor.tsx` — Make dollar amount clickable

**Add state** (~line 69):
- `editingAmount: { sovId: string; itemId: string } | null`
- `editingAmountValue: string`

**Add handlers**:
- `handleStartAmountEdit(sovId, item)` — sets state with current `value_amount`
- `handleSaveAmountEdit()` — parses value, calls `updateItemAmount`, clears state

**Modify the dollar amount span** (lines 350-352):
- When `editingAmount` matches, show an inline `<Input type="number">` with confirm/cancel buttons (same pattern as percent editing)
- When not editing, make the span clickable (add `onClick` + `cursor-pointer` styling) so clicking the dollar value directly opens the editor — no extra pencil button needed

### Files Changed
- `src/hooks/useContractSOV.ts` — add `updateItemAmount`
- `src/components/sov/ContractSOVEditor.tsx` — dollar amount inline editing

