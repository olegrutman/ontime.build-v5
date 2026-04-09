

# Fix: Show Both SOVs Side-by-Side

## Problem
The dual SOV layout uses `grid-cols-1 md:grid-cols-2` which should work at your viewport width. But each SOV card has `h-[calc(100vh-280px)]` — when stacked in a single column (before the grid kicks in or due to overflow), the second SOV gets pushed below the viewport. More critically, the grid container itself is inside the right half of a `lg:grid-cols-2` split, so both SOVs are fighting for space in 50% of the screen.

## Fix: Stack SOVs vertically in the right column (top/bottom)
Since the right panel is only ~50% of the screen, putting two SOVs side-by-side makes each one too narrow to read. Instead, stack them **vertically** — each taking half the available height.

### `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx`
- Change the right-side SOV container from a 2-column grid to a **single column with two rows**, each SOV taking `h-[calc(50vh-150px)]` when dual, or full height when single
- This ensures both SOVs are always visible without scrolling, one above the other
- Each SOV card remains independently scrollable for its line items

| File | Change |
|------|--------|
| `src/components/setup-wizard-v2/ScopeQuestionsPanel.tsx` | Stack dual SOVs vertically (top/bottom) instead of side-by-side; adjust heights to split viewport |

