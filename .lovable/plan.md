

# Fix: Make Data Manager Tables Readable

## Problem
All text in the data table cells is truncated — inputs are too narrow and columns are cramped, making it impossible to read values like "Foundation" or "Exterior sheathing."

## Fix

### 1. `DataTableShell.tsx` — Add horizontal scroll wrapper
Wrap the table in an `overflow-x-auto` container with `min-w-[900px]` on the table so columns get enough room and the user can scroll horizontally if needed.

### 2. `EditableCell.tsx` — Widen inputs
Change default input className from `h-8 text-xs` to `h-8 text-xs min-w-[120px]` for text inputs and `h-8 text-xs min-w-[80px]` for number inputs. This prevents columns from collapsing to near-zero width.

### 3. `ScopeSectionsTable.tsx` — Give Description column more room
Pass `className="h-8 text-xs min-w-[200px]"` to the Description cell's `EditableCell` so longer descriptions are visible.

### Files Modified
| File | Change |
|------|--------|
| `DataTableShell.tsx` | Add `overflow-x-auto` wrapper, `min-w` on table |
| `EditableCell.tsx` | Add `min-w` defaults for text vs number inputs |
| `ScopeSectionsTable.tsx` | Wider Description cell |

