
# Plan: Dynamic Filter Discovery for Product Picker

## Summary

Replace the hardcoded `SPEC_PRIORITY` configuration with dynamic field discovery. The picker will query the database to find which `catalog_items` fields actually have values for the current category/secondary combination, then present those as sequential filter steps.

---

## Problem Statement

Currently, the `StepByStepFilter` component uses a hardcoded `SPEC_PRIORITY` configuration that pre-defines which fields to filter by for each category. This approach:

1. **Misses available data** - Some fields with values are not included in the filter sequence
2. **Shows empty filters** - Some configured fields have no data for certain secondaries
3. **Requires manual maintenance** - Every time data changes, the config needs updating

---

## Proposed Solution

Create a **dynamic filter discovery** system that:

1. Queries the database to find which filterable fields have non-null values
2. Orders the fields by coverage (most populated first) or by a priority ranking
3. Presents each field as a sequential filter step
4. Skips fields that have no values or only one value (auto-select)

---

## Filterable Fields from `catalog_items`

Based on the database schema, these are the filterable specification fields:

| Field | Description |
|-------|-------------|
| `dimension` | Size spec (e.g., 2x4, 1x6) |
| `length` | Length (e.g., 8ft, 12ft) |
| `color` | Color option |
| `wood_species` | Species (e.g., Cedar, Hemlock) |
| `thickness` | Thickness spec |
| `finish` | Finish type |
| `manufacturer` | Brand/manufacturer |
| `use_type` | Use type classification |
| `product_type` | Product type |
| `edge_type` | Edge type |
| `depth` | Depth measurement |
| `width` | Width measurement |
| `diameter` | Diameter (for round products) |

---

## Implementation Approach

### Option A: Fully Dynamic Discovery (Recommended)

The `StepByStepFilter` component will:

1. **On mount**, query the database for field coverage within the filtered product set
2. **Build a dynamic filter sequence** based on which fields have multiple distinct values
3. **Order by priority** using a simple ranking (user-facing fields first, technical fields last)
4. **Present each step** allowing the user to select a value

```text
Flow Example: Exterior > SIDING
1. Query discovers: use_type(48), product_type(48), manufacturer(40), finish(42), dimension(48), length(29)
2. Priority order applied: manufacturer → use_type → product_type → finish → dimension → length
3. User steps through each filter that has >1 distinct value
```

### File Changes

**1. `src/types/poWizardV2.ts`**

- Remove `SPEC_PRIORITY` (or keep as fallback)
- Add `FILTERABLE_FIELDS` constant listing all possible filter fields
- Add `FILTER_PRIORITY` ordering for consistent UX
- Update `FIELD_LABELS` to include all new fields

```typescript
// All possible filterable fields from catalog_items
export const FILTERABLE_FIELDS = [
  'manufacturer',
  'use_type', 
  'product_type',
  'wood_species',
  'dimension',
  'length',
  'color',
  'thickness',
  'finish',
  'depth',
  'width',
  'edge_type',
  'diameter',
] as const;

// Priority order for filter display (higher priority = shown first)
export const FILTER_PRIORITY: Record<string, number> = {
  manufacturer: 100,
  use_type: 90,
  product_type: 80,
  wood_species: 70,
  dimension: 60,
  length: 50,
  color: 45,
  thickness: 40,
  finish: 35,
  depth: 30,
  width: 25,
  edge_type: 20,
  diameter: 10,
};

// Updated field labels
export const FIELD_LABELS: Record<string, string> = {
  dimension: 'Dimension',
  length: 'Length',
  color: 'Color',
  wood_species: 'Species',
  thickness: 'Thickness',
  finish: 'Finish',
  manufacturer: 'Manufacturer',
  use_type: 'Use Type',
  product_type: 'Product Type',
  edge_type: 'Edge Type',
  depth: 'Depth',
  width: 'Width',
  diameter: 'Diameter',
};
```

**2. `src/components/po-wizard-v2/StepByStepFilter.tsx`**

- Add `discoverFilterSequence` function that queries the database
- Replace static `getFilterSequence` call with dynamic discovery
- Cache the discovered sequence to avoid re-querying on each step

```typescript
// New function to discover available filters dynamically
const discoverFilterSequence = async (
  supplierId: string,
  category: string,
  secondaryCategory: string | null
): Promise<string[]> => {
  // Query to count non-null values for each filterable field
  const { data, error } = await supabase
    .from('catalog_items')
    .select(FILTERABLE_FIELDS.join(','))
    .eq('supplier_id', supplierId)
    .eq('category', category)
    .match(secondaryCategory ? { secondary_category: secondaryCategory } : {});

  if (error || !data) return [];

  // Count distinct non-null values per field
  const fieldCounts: Record<string, Set<string>> = {};
  FILTERABLE_FIELDS.forEach(field => {
    fieldCounts[field] = new Set();
  });

  data.forEach(item => {
    FILTERABLE_FIELDS.forEach(field => {
      const value = (item as any)[field];
      if (value) fieldCounts[field].add(value);
    });
  });

  // Filter to fields with 2+ distinct values, sort by priority
  return FILTERABLE_FIELDS
    .filter(field => fieldCounts[field].size >= 2)
    .sort((a, b) => (FILTER_PRIORITY[b] || 0) - (FILTER_PRIORITY[a] || 0));
};
```

---

## Updated Filter Flow

```text
Category Grid
└── EXTERIOR TRIM 🏠
    └── [Secondary: SIDING]
        └── [Dynamic Discovery: finds manufacturer, use_type, product_type, finish, dimension, length]
            └── Step 1: Manufacturer (HARDIE, LP, ALLURA)
                └── Step 2: Use Type (LAP, VERTICAL, PANEL)
                    └── Step 3: Product Type (SIDING, PRIMED SIDING, ...)
                        └── Step 4: Finish (PRIMED, CEDAR MILL, ...)
                            └── Step 5: Dimension (5/16"x8-1/4", ...)
                                └── Step 6: Length (12ft, 16ft)
                                    └── Product List
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/poWizardV2.ts` | Add `FILTERABLE_FIELDS`, `FILTER_PRIORITY`, update `FIELD_LABELS`, optionally deprecate `SPEC_PRIORITY` |
| `src/components/po-wizard-v2/StepByStepFilter.tsx` | Add dynamic discovery logic, replace static filter sequence |

---

## Technical Considerations

1. **Performance**: The discovery query runs once when entering filter-step mode. Results are cached for the session.

2. **Auto-advance**: If a field has only 1 distinct value, it's auto-selected and skipped (current behavior preserved).

3. **Skip fields with 0 values**: Fields with no data for the current filter set are automatically excluded.

4. **Consistent ordering**: `FILTER_PRIORITY` ensures manufacturer always comes before use_type, etc., for a predictable UX.

5. **Backward compatibility**: The `SPEC_PRIORITY` can be kept as a fallback if dynamic discovery fails.

---

## Example: Engineered > GLUELAM

Database shows:
- `depth`: 49 items (100%)
- `width`: 49 items (100%) 
- `wood_species`: 2 items (4%)

Dynamic discovery would produce: `['depth', 'width', 'wood_species']`

Since wood_species only has 2 items, it would be included as a valid filter step.
