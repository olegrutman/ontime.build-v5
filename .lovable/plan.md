

# Fix: Catalog not showing in CO wizard

## Root cause

The Dialog layout has a height collapse issue. The `body` div uses `h-full` and `flex-1`, but the parent `DialogContent` is not a flex column container, so the height chain breaks and the content area collapses to zero (or near-zero) height. The catalog data is loading correctly (256 rows, RLS is fine), but the content has nowhere to render visually.

## Fix

### 1. `src/components/change-orders/wizard/COWizard.tsx` — Fix Dialog layout

**Desktop Dialog** (lines 324-357): Make the `DialogContent` a flex column so child `flex-1` elements can expand properly:
- Add `flex flex-col` to `DialogContent` className
- Remove the wrapping `<div className="flex-1 min-h-0 overflow-hidden">` around `{body}` since `body` itself already handles flex layout
- Change `body`'s root from `h-full` to `flex-1 min-h-0` so it participates in the flex chain correctly

Also add a `DialogTitle` (can be visually hidden via `sr-only` class) to fix the accessibility console error.

**Specific changes:**
- Line 326: `<DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden max-h-[85vh]">` → add `flex flex-col`
- Line 331-332: Add `<DialogTitle className="sr-only">New Change Order</DialogTitle>` inside the header area (import `DialogTitle`)
- Line 352: Remove the wrapper div, render `{body}` directly
- Line 199: Change `<div className="flex flex-col h-full">` to `<div className="flex flex-col flex-1 min-h-0">`

### 2. Import fix
Add `DialogTitle` to the Dialog import on line 2.

## Technical details
- `DialogContent` from Radix uses `position: fixed` with no intrinsic flex layout. Children using `flex-1` and `h-full` collapse without an explicit flex parent.
- The `max-h-[85vh]` constraint is correct but needs the flex chain to propagate height to the scrollable content area.

