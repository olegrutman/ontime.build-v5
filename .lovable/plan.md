

# Fix: Scrolling in "Project Estimate" Mode

## Problem

When "Project Estimate" is selected, the pack list inside `PackSelector` doesn't scroll. This is because:

1. The `ItemsScreen` parent container (line 104) already has `overflow-y-auto` to handle scrolling
2. Inside it, `PackSelector` wraps its content in a `ScrollArea` with `h-[calc(100%-2rem)]` (line 152)
3. The `ScrollArea` height resolves to essentially zero because `100%` refers to the parent's content height which is determined by flex layout — there's no concrete pixel height to calculate against
4. This creates a nested scroll context that fails silently

## Solution

Remove the `ScrollArea` wrapper from `PackSelector` and let the pack cards render directly. The parent `overflow-y-auto` container in `ItemsScreen` already provides the scrolling — the same pattern used by the "Full Catalog" mode where items just render inside the same scrollable parent.

## File to Change

**`src/components/po-wizard-v2/PackSelector.tsx`**

- Remove the `ScrollArea` import and wrapper around the pack list (lines 5, 152, 191)
- Let the pack cards render directly in the parent `div`
- This matches how the catalog item list renders in the same `ItemsScreen` scrollable container
