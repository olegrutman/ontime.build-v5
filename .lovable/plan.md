

# Fix Double "Add Pricing Entry" Form

## Problem
When `autoExpand` is true (empty line items), two `LaborEntryForm` instances render:
1. The `Collapsible` on line 298 opens because `open={formOpen || autoExpand}` is true, rendering a form inside `CollapsibleContent` (line 322)
2. The standalone auto-expand block on lines 336-346 renders a second identical form

## Fix

**`src/components/change-orders/COLineItemRow.tsx`**

- Remove the standalone auto-expand block (lines 335-346) entirely — it's redundant
- The Collapsible already handles auto-expand via `open={formOpen || autoExpand}` and hides the trigger button when `autoExpand` is true (`!autoExpand && <CollapsibleTrigger>`)

One deletion, one file. The Collapsible already does everything the standalone block does.

