

# Add Packs / PSM Tabs to Project Estimate Mode

## Overview

When users choose "Project Estimate" ordering mode, instead of jumping straight to the pack list, they'll first see two tabs: **Packs** and **PSM (Project Specific Materials)**. Packs works exactly as today. PSM lets users browse all estimate items organized into the same category structure as the full catalog, plus an "Unmatched Items" category for items not linked to the catalog.

## How It Works

```text
User picks "Project Estimate" mode
         |
    +-----------+
    |  Two Tabs  |
    +-----------+
    |           |
  Packs       PSM
    |           |
  (current   Category Grid
   pack list)  (built from estimate items
    |           joined to catalog_items)
    |           |
    |        Secondary Category
    |           |
    |        Spec Filters (same as catalog)
    |           |
    |        Product List (only estimate items)
    |           |
    |        Quantity Panel
    |           |
    +------> Item added to PO
```

## Key Design Decisions

- PSM categories are built dynamically by joining `supplier_estimate_items` to `catalog_items` and grouping by `category`/`secondary_category`
- The "Unmatched Items" category collects all estimate items where `catalog_item_id` is null
- Selecting a matched PSM product opens the same `QuantityPanel` used by the full catalog (with bundle/engineered support)
- Selecting an unmatched PSM item opens the `UnmatchedItemEditor` (quantity + delete only)
- PSM items are added one at a time (unlike Packs which loads an entire group)

## Files to Create

### 1. `src/components/po-wizard-v2/EstimateSubTabs.tsx`
A tab bar component with two options: "Packs" and "Materials (PSM)". Renders either the existing `PackSelector` or a new `PSMBrowser` depending on selection.

### 2. `src/components/po-wizard-v2/PSMBrowser.tsx`
The main PSM browsing component. Manages the drill-down state machine:
- **category** -- Shows a `CategoryGrid` built from estimate item categories
- **secondary** -- Shows a `SecondaryCategoryList` for the selected category
- **filter-step** -- Reuses `StepByStepFilter` scoped to estimate catalog items
- **products** -- Shows estimate items matching the filters (uses `ProductList`)
- **quantity** -- Uses `QuantityPanel` for matched items
- **unmatched-list** -- Special view listing unmatched items with quantity/delete controls

Data flow:
1. On mount, fetches all `supplier_estimate_items` for the approved estimate, joined with `catalog_items` to get category info
2. Groups matched items by virtual category (same `VIRTUAL_CATEGORIES` mapping) to build category counts
3. Adds an "Unmatched Items" tile if any items have no `catalog_item_id`
4. For matched items, the drill-down reuses the same catalog picker flow but queries are filtered to only the `catalog_item_id` values from the estimate
5. The `StepByStepFilter` and `ProductList` query `catalog_items` but with an additional `.in('id', estimateCatalogItemIds)` constraint

## Files to Modify

### 3. `src/components/po-wizard-v2/ItemsScreen.tsx`
- Replace the direct `PackSelector` render with the new `EstimateSubTabs` component
- Pass through `onAddItem` and `onLoadPack` callbacks
- The `showPackSelector` condition becomes `showEstimateBrowser` to cover both tabs

### 4. `src/components/po-wizard-v2/POWizardV2.tsx`
- Add a handler for individual PSM item adds (matched items go through `ProductPicker`-like flow, unmatched through `UnmatchedItemEditor`)
- Pass an `onAddPSMItem` callback to `ItemsScreen` that creates a `POWizardV2LineItem` from the selected catalog product

### 5. `src/components/po-wizard-v2/index.ts`
- Export the new components

## Technical Details

### PSM Category Building Logic

```text
1. Query: SELECT sei.*, ci.category, ci.secondary_category, ci.id as ci_id
   FROM supplier_estimate_items sei
   LEFT JOIN catalog_items ci ON sei.catalog_item_id = ci.id
   WHERE sei.estimate_id = ?

2. Group matched items by ci.category -> map to VIRTUAL_CATEGORIES keys
3. Count items per virtual category
4. Collect unmatched items (catalog_item_id IS NULL) separately
5. Build CategoryCount[] array + optional "UNMATCHED" entry
```

### PSM Product Filtering

When drilling into a PSM category, the product queries add an extra constraint:
- Collect all `catalog_item_id` values from the estimate for the selected category
- Query `catalog_items` filtered with `.in('id', catalogItemIds)` 
- This ensures users can only select products that appear in their estimate

### Unmatched Items View

The "Unmatched Items" category shows a flat list of estimate items without catalog matches. Each item shows:
- Description from the estimate
- Quantity and UOM from the estimate  
- Tap to add directly to PO (opens a simplified quantity picker)
- Items are added with empty `catalog_item_id` and a warning note

### PSM Quantity Tracking

Each PSM item from the estimate carries a `quantity` (from the estimate). When adding to PO:
- The quantity panel pre-fills with the estimate quantity as a suggestion
- Users can adjust freely
- The same item can be added multiple times (e.g., split across deliveries)
