

# Expandable Packs in Estimate Summary

## What Changes

### 1. Make packs clickable/expandable in EstimateSummaryCard
Each pack row in the "Pack Breakdown" section becomes an accordion-style toggle. Clicking a pack expands it to reveal all items in that pack, showing description, quantity, UOM, unit price, and line total per item.

### 2. Remove duplicate item tables from detail sheet
Currently, the SupplierProjectEstimates page renders both the EstimateSummaryCard AND a separate grouped item table below it. Since the summary card will now contain the expandable item details, the separate table block (lines 652-712) will be removed to avoid duplication.

### 3. Add unit price and line total columns to item display
Each expanded pack will show a mini table with columns: SKU, Description, Qty, UOM, Unit Price, Line Total. This gives the supplier full pricing visibility per item.

## Technical Details

### File: `src/components/estimate-summary/EstimateSummaryCard.tsx`

**Changes:**
- Accept `items` (already does) and compute a `packItems` map: `Map<string, SupplierEstimateItem[]>` alongside the existing `PackSummary` data
- Add `expandedPacks` state: `Set<string>` tracking which packs are open
- Make each pack row clickable with a chevron icon that rotates on expand
- When expanded, render a compact table below the pack row showing each item with: SKU, Description, Qty, UOM, Unit Price ($X.XX), Line Total ($X.XX)
- Add a Collapsible component (from Radix) around each pack's item list

### File: `src/pages/SupplierProjectEstimates.tsx`

**Changes:**
- Remove the separate grouped items table block (lines 652-712, the fragment with pack headers and Table components)
- The EstimateSummaryCard now serves as both summary and item browser

### File: `src/components/project/SupplierEstimatesSection.tsx`

**Changes:**
- Same removal of the duplicate grouped items table that appears after EstimateSummaryCard in the detail sheet

## Files Changed

| File | Change |
|------|--------|
| `src/components/estimate-summary/EstimateSummaryCard.tsx` | Add expandable pack rows with item details |
| `src/pages/SupplierProjectEstimates.tsx` | Remove duplicate item tables below summary |
| `src/components/project/SupplierEstimatesSection.tsx` | Remove duplicate item tables below summary |

