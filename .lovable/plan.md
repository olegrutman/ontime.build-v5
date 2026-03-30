

# Make SOV % and Name Click-to-Edit (Like Dollar Amount)

## What
Currently, to edit a line item's **percentage** or **name**, the user must click a small pencil icon that appears on hover. The **dollar amount** already supports click-to-edit directly on the text. This change makes percentage and name behave the same way — clicking them directly opens the inline editor.

## Changes

### `src/components/sov/ContractSOVEditor.tsx`

1. **Name text (line ~332)** — Make the item name span clickable when SOV is unlocked. Clicking it calls `handleStartEdit(sov.id, item)` to open the inline name editor. Add `cursor-pointer hover:text-primary` styling (same as dollar amount).

2. **Percentage text (line ~391-393)** — Make the percentage span clickable when SOV is unlocked. Clicking it calls `handleStartPercentEdit(sov.id, item)` to open the inline percent editor. Add `cursor-pointer hover:text-primary` styling.

3. **Remove duplicate pencil buttons (lines ~406-423)** — The two separate pencil icon buttons for editing percent and name become redundant since clicking the values directly opens editors. Remove them to declutter the UI.

### Files Changed
- `src/components/sov/ContractSOVEditor.tsx` — click-to-edit on name and %, remove pencil buttons

