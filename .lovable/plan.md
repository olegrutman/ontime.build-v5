

# Gantt Drag Bugs

## Bug 1 (Critical): Click fires after drag, opening edit form

After dragging a bar to move/resize it, the browser fires a `click` event on mouseup. The center move handle has `onClick={() => onSelect?.(item.id)}`, which calls `handleEdit`, opening the edit dialog every time you finish dragging. This makes drag-to-move unusable — every move opens the form.

**Fix:** Track whether an actual drag occurred (delta !== 0). Suppress `onSelect` click if the interaction was a drag. Add a `didDrag` ref that gets set to `true` on mouseup when `dragDeltaDays !== 0`, and check it in the click handler.

## Bug 2 (Minor): Dragging items without end_date uses start_date as end

When `item.end_date` is null, the drag handlers pass `item.start_date` as both start and end. This means:
- Resize-right starts from a 0-duration bar, which is confusing
- Move works but saves an `end_date` equal to `start_date` even if user didn't intend one

**Fix:** For items without `end_date`, compute a synthetic end date (start + 1 day) for drag purposes, so resize behavior is sensible.

## Bug 3 (Minor): No visual feedback during drag

The bar opacity drops to 0.7 during drag, but there's no tooltip or date label showing what the new dates will be. Users drag blind.

**Fix:** Add a small text label above the dragged bar showing the projected start/end dates during drag.

---

## Files to modify

| File | Change |
|------|--------|
| `GanttChart.tsx` | Add `didDrag` ref to suppress click after drag; fix null end_date handling; add date tooltip during drag |

No other files need changes.

