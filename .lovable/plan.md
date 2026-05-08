## Goal

A single CO submission from the picker should create **exactly one `co_line_items` row**, with all selected scope work types rolled into a structured description (instead of one row per work type).

## Background — current behavior

In `src/components/change-orders/picker-v3/PickerShell.tsx`, the create-mode loop iterates `item.workTypes` and inserts one `co_line_items` row per work type. The same logic lives in the add-mode branch (adding scope to an existing CO). The narrative is duplicated onto every row. That's why a CO with 3 selected scopes shows 3 separate "Needs Pricing" line rows on the detail page.

## Changes

### 1. `PickerShell.tsx` — Create mode (lines ~292–320)

Replace the per-work-type insert with a single insert per picker item:

- **`item_name`**: use the user's narrative (truncated to 120 chars) if present; otherwise fall back to `${systemName} · ${causeName}` or the first work-type name.
- **`description`**: build a multi-line string combining:
  - The narrative paragraph (if any), then
  - A "Scope:" section with the selected work-type names as a bulleted list (`• Wall relocation\n• New wall framing\n• Reframe existing wall`).
  - If no work types are selected, just the narrative.
- **`unit`**: `'EA'`, **`sort_order`**: `1`.

One row, one price, one item to bill.

### 2. `PickerShell.tsx` — Add mode (lines ~138–175)

Mirror the same single-insert logic when adding scope to an existing CO. `sort_order` continues from `maxSort + 1` (only +1 instead of +N).

### 3. Activity log

Update the "Added N item(s)" toast and `co_activity` detail in add mode to count picker items (not work types), so messages stay accurate.

### 4. No DB schema changes

`co_line_items` already supports a `description` field. Existing CO detail UI (`SCOPE & LABOR` card) already renders `item_name` + `description`, so the bundled description will appear naturally under the single row.

### 5. Out of scope (do NOT touch)

- The picker UI itself (Step 2 still lets users tick multiple work-types — they just collapse into one row on save).
- The "Add another item" flow in the picker — that explicitly creates a separate picker item and remains a separate CO/line.
- Existing COs with multiple rows are not migrated.

## Acceptance check

After picking *Wall relocation + New wall framing + Reframe existing wall* with narrative "Reframe per revised plans":
- CO detail shows **1** line item.
- Item name = "Reframe per revised plans".
- Description shows the narrative followed by a bulleted list of all 3 scopes.
- Pricing card shows `0/1 priced` (not `0/3`).
