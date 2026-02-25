

# Add Category-Based Material Picker to Create Return Wizard

## Current Problem

Step 0 of the Create Return Wizard shows a flat table of all delivered PO line items. When a project has many delivered items (dozens to hundreds), this is overwhelming and hard to navigate.

## Solution

Replace the flat table with a two-level category browser:

1. **Category Grid** -- Shows categories (Framing Lumber, Hardware, Engineered Wood, etc.) with item counts, using the same icons/layout as the PO wizard's `CategoryGrid`
2. **Items within Category** -- Shows only items in the selected category, with checkboxes, search, and quantity inputs

Users can navigate back from items to categories to pick from multiple categories. A chip/badge bar at the top shows how many items are selected so far.

## How Categories Are Determined

`po_line_items` have a `supplier_sku` field. We join to `catalog_items` via `supplier_sku` to get the `category` field. Items that don't match a catalog entry are grouped under "Uncategorized."

## UI Flow

```text
+----------------------------------+
|  Create Return - Select Items    |
|----------------------------------|
|  Supplier: ABC Supply            |
|  [3 items selected]              |
|----------------------------------|
|  +------------+ +------------+   |
|  | FRAMING    | | HARDWARE   |   |
|  | LUMBER 🪵  | | 🔩         |   |
|  | 12 items   | | 5 items    |   |
|  +------------+ +------------+   |
|  +------------+ +------------+   |
|  | SHEATHING  | | OTHER      |   |
|  | 📦         | | 📋         |   |
|  | 3 items    | | 2 items    |   |
|  +------------+ +------------+   |
+----------------------------------+

    User taps "FRAMING LUMBER"

+----------------------------------+
|  < Back   FRAMING LUMBER         |
|  [3 items selected total]        |
|----------------------------------|
|  [Search items...]               |
|  [x] Select All                  |
|----------------------------------|
|  [x] 2X4X12 #2 DF  (PO-001)     |
|      Del: 50  Avail: 45  Qty:[5] |
|  [ ] 2X4X16 #2 DF  (PO-001)     |
|      Del: 30  Avail: 30          |
|  ...                             |
+----------------------------------+
```

## Technical Details

### Data Flow

1. Fetch delivered `po_line_items` (existing query -- unchanged)
2. Extract unique `supplier_sku` values from results
3. Batch-query `catalog_items` to get `category` for each SKU
4. Group delivered items by category
5. Build `CategoryCount[]` array with display names and icons from `VIRTUAL_CATEGORIES`

### Files to Modify

| Action | File | Changes |
|--------|------|---------|
| Edit | `src/components/returns/CreateReturnWizard.tsx` | Replace flat table in Step 0 with category grid + category detail view. Add `activeCategory` state. Add catalog category lookup query. Reuse `VIRTUAL_CATEGORIES` icons/names. |

### New State Variables

- `activeCategory: string | null` -- which category is being browsed (null = show grid)

### Category Grid Rendering

Reuse the icon and display name mappings from `VIRTUAL_CATEGORIES` in `src/types/poWizardV2.ts`. The grid will be rendered inline (not a separate component) to keep it simple, using the same styling pattern as `CategoryGrid`.

### Item List Within Category

When a category is selected, show:
- Back button to return to category grid
- Search input filtering items within that category
- Select-all checkbox for filtered items
- Item rows with checkbox, description, PO number, delivered/available quantities, and return qty input

### Selected Items Badge

A summary bar above the grid/list showing "N items selected" so the user knows their progress across categories.

