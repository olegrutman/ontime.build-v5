

# Fix: SOV Edit Buttons Not Visible

## Problem
The pencil (edit) buttons for SOV line items are invisible on desktop screens. They use Tailwind's `sm:opacity-0 sm:group-hover:opacity-100` transition, which requires a parent element with the `group` class. The parent row div is missing `group`, so hover never reveals the buttons.

## Fix
Add the `group` class to the SOV item row container div (around line 534 in `ContractSOVEditor.tsx`).

## Technical Details

### File: `src/components/sov/ContractSOVEditor.tsx`

**Line ~542** -- Add `group` to the item wrapper div's className:

```
className={`
  group
  rounded-lg border bg-card overflow-hidden
  ${isDragging ? 'opacity-50' : ''}
  ${isDragOver ? 'border-primary border-2' : 'border-border'}
  transition-colors
`}
```

This is a one-line fix. Once `group` is on the parent, the existing `sm:group-hover:opacity-100` on the pencil buttons (lines 630 and 639) will work correctly -- buttons stay hidden until the user hovers the row, then appear.
