

# Step-by-Step Spec Filters for Product Picker

## Overview

Transform the current "show all filters at once" approach into a **sequential step-by-step filter flow** where users select one specification at a time. This creates a guided "drilling down" experience that matches the lumber yard metaphor.

---

## Current vs. Proposed Flow

### Current Flow
```text
Category → Secondary → [ALL FILTERS SHOWN AT ONCE] → Products
                           ↓
              Dimension: [2x4] [2x6] [All]
              Length:    [8ft] [12ft] [All]  
              Species:   [SPF] [DF] [All]
```

### Proposed Step-by-Step Flow
```text
Category → Secondary → Dimension → Length → [Products]
                         ↓            ↓
                     Pick one     Pick one
                     [2x4]        [12 ft.]
                        ↓            ↓
                   (auto-advance) (auto-advance)
```

Each spec selection auto-advances to the next filter step. Counts update dynamically to show only valid combinations.

---

## New UI Design

### Step-by-Step Filter Screen

```text
┌────────────────────────────────────────────────────────────────┐
│  ← Back              Select Dimension                      X  │
├────────────────────────────────────────────────────────────────┤
│  FRAMING LUMBER > STUDS                                        │
│  Step 1 of 3                                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌──────────────────────────────────────┐                     │
│   │  2 in. x 4 in.                   18  │                     │
│   └──────────────────────────────────────┘                     │
│   ┌──────────────────────────────────────┐                     │
│   │  2 in. x 6 in.                   18  │                     │
│   └──────────────────────────────────────┘                     │
│   ┌──────────────────────────────────────┐                     │
│   │  2 in. x 8 in.                   12  │                     │
│   └──────────────────────────────────────┘                     │
│   ┌──────────────────────────────────────┐                     │
│   │  2 in. x 10 in.                   8  │                     │
│   └──────────────────────────────────────┘                     │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│          [ Skip - View All 56 Products ]                       │
└────────────────────────────────────────────────────────────────┘
```

### After Selecting Dimension → Next Filter

```text
┌────────────────────────────────────────────────────────────────┐
│  ← Back              Select Length                          X │
├────────────────────────────────────────────────────────────────┤
│  FRAMING LUMBER > STUDS > 2x4                                  │
│  Step 2 of 3                                                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌──────────────────────────────────────┐                     │
│   │  92-5/8 in.                       3  │                     │
│   └──────────────────────────────────────┘                     │
│   ┌──────────────────────────────────────┐                     │
│   │  104-5/8 in.                      3  │                     │
│   └──────────────────────────────────────┘                     │
│   ┌──────────────────────────────────────┐                     │
│   │  116-5/8 in.                      3  │                     │
│   └──────────────────────────────────────┘                     │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│          [ Skip - View All 9 Products ]                        │
└────────────────────────────────────────────────────────────────┘
```

### Final Step or Auto-Advance to Products

When all filters are applied OR only 1 value remains for next filter, auto-advance to product list.

---

## Technical Implementation

### 1. Update `SPEC_PRIORITY` with Complete Category Mapping

Expand the spec priority map to cover all categories with their specific filter sequences:

```typescript
export const SPEC_PRIORITY: Record<string, string[]> = {
  // Decking products
  Decking: ['dimension', 'color', 'length', 'manufacturer'],
  
  // Lumber - dimension-based
  Dimensional: ['dimension', 'length', 'wood_species'],
  
  // Other category - depends heavily on secondary
  Other: {
    default: ['dimension', 'length'],
    STUDS: ['dimension', 'length', 'wood_species'],
    DIMENSION: ['dimension', 'length', 'wood_species'],
    OSB: ['thickness', 'dimension'],
    CDX: ['thickness', 'dimension'],
    'INTERIOR DRYWALL': ['thickness', 'dimension'],
    'EXTERIOR DRYWALL': ['thickness', 'dimension'],
    SIDING: ['dimension', 'manufacturer'],
    TREATED: ['dimension', 'length'],
  },
  
  // Engineered wood
  Engineered: ['dimension', 'length'],
  
  // Hardware - skip directly to products (no specs to filter)
  Hardware: [],
  
  // Exterior trim
  Exterior: ['dimension', 'finish', 'manufacturer'],
  
  // Sheathing
  Sheathing: ['thickness', 'dimension'],
  
  // Structural steel - skip to products
  Structural: [],
};
```

### 2. Create New `StepByStepFilter.tsx` Component

Replace the chip-based `SpecFilters.tsx` with a new step-by-step component:

```typescript
interface StepByStepFilterProps {
  supplierId: string;
  category: string;
  secondaryCategory: string | null;
  onComplete: (filters: Record<string, string>) => void;
  onBack: () => void;
}

// State tracks:
// - currentStep: number (0, 1, 2, ...)
// - appliedFilters: Record<string, string> 
// - availableValues: SpecValue[] for current step
```

### 3. Update ProductPicker Flow

Modify `ProductPicker.tsx` to:
- Replace `'specs'` step with `'filter-step'` 
- Track filter step index
- Handle auto-advance when only 1 option exists
- Handle "Skip" action to go directly to products

```typescript
type PickerStep = 
  | 'category' 
  | 'secondary' 
  | 'filter-step'  // New: replaces 'specs'
  | 'products' 
  | 'quantity';

// Additional state:
const [filterStepIndex, setFilterStepIndex] = useState(0);
const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});
```

### 4. Dynamic Filter Priority Lookup

Create helper function to get filter sequence based on category and secondary:

```typescript
function getFilterSequence(category: string, secondary: string | null): string[] {
  const categoryPriority = SPEC_PRIORITY[category];
  
  // Handle categories with secondary-specific priorities (like "Other")
  if (typeof categoryPriority === 'object' && secondary) {
    return categoryPriority[secondary] || categoryPriority.default || [];
  }
  
  return Array.isArray(categoryPriority) ? categoryPriority : [];
}
```

### 5. Count Query with Applied Filters

Each step queries available values for the current filter field, applying all previously selected filters:

```typescript
const fetchFilterValues = async (filterField: string, appliedFilters: Record<string, string>) => {
  const filterObj = {
    supplier_id: supplierId,
    category: category,
    ...(secondaryCategory && { secondary_category: secondaryCategory }),
    ...Object.fromEntries(
      Object.entries(appliedFilters).filter(([_, v]) => v !== 'all')
    ),
  };

  const { data } = await supabase
    .from('catalog_items')
    .select(filterField)
    .match(filterObj);

  // Count occurrences
  const counts = {};
  data?.forEach(item => {
    const value = item[filterField];
    if (value) counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count);
};
```

---

## Files to Create

### `src/components/po-wizard-v2/StepByStepFilter.tsx`

New component for sequential filter selection with:
- Breadcrumb showing category path and applied filters
- Step indicator (Step 1 of 3)
- Full-width tap targets for each filter value
- Count badges on the right
- "Skip - View All X Products" footer action

---

## Files to Modify

### `src/types/poWizardV2.ts`

Update `SPEC_PRIORITY` to support secondary-category-specific filter sequences for the "Other" category.

### `src/components/po-wizard-v2/ProductPicker.tsx`

- Replace `SpecFilters` with `StepByStepFilter`
- Update step type to include `filter-step`
- Add filter step index state
- Handle back navigation through filter steps
- Handle skip action

### `src/components/po-wizard-v2/SpecFilters.tsx`

This file will be replaced by `StepByStepFilter.tsx` and can be deleted or kept for reference.

---

## Auto-Advance Rules

1. **Single value**: If current filter step has only 1 option, auto-select and advance
2. **No values**: If current filter field has no applicable values (all null), skip to next filter
3. **End of filters**: When all filter steps are complete, auto-advance to products
4. **Hardware/Structural**: Skip directly from secondary to products (empty filter sequence)

---

## Back Navigation

Pressing back during filter steps:
- If on first filter step → go back to secondary (or category if no secondary)
- If on subsequent filter steps → go back one filter step, clear that filter value

---

## Mobile UX Details

- Full-width buttons for each filter value (44px min height)
- Large count badges for easy readability
- Sticky footer with "Skip" option always visible
- Progress indicator showing current step
- Animated transitions between filter steps

---

## Summary

| Step | Action |
|------|--------|
| 1 | User taps category tile (e.g., "FRAMING LUMBER") |
| 2 | User taps secondary category (e.g., "STUDS") |
| 3 | **New**: User taps dimension (e.g., "2x4") → auto-advance |
| 4 | **New**: User taps length (e.g., "12 ft.") → auto-advance |
| 5 | Products list appears filtered to exact selection |

Users can "Skip" at any filter step to see all remaining products matching current filters.
