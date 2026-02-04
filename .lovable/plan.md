
# Plan: Fix Filter Steps Not Being Applied

## Root Cause

The picker has **two conflicting filter systems**:

1. **Old system (`getFilterSequence` + `SPEC_PRIORITY`)**: Hardcoded list of 3 fields per category
2. **New system (dynamic discovery in `StepByStepFilter`)**: Discovers ALL fields with data

The problem: `ProductPicker.tsx` uses the **old** `getFilterSequence()` function to decide whether to show the filter-step screen. This means:

- If a category isn't in `SPEC_PRIORITY`, it skips directly to products (no filtering)
- Even for Exterior, it only knows about 3 fields (`manufacturer`, `use_type`, `product_type`) - missing `finish`, `dimension`, `length`, `color`, etc.

## Current Broken Flow

```text
User selects: EXTERIOR TRIM → SIDING

ProductPicker checks: getFilterSequence('Exterior', 'SIDING')
                     → Returns: ['manufacturer', 'use_type', 'product_type']
                     → Goes to StepByStepFilter

StepByStepFilter runs: discoverFilterSequence()
                     → Discovers: manufacturer, use_type, product_type, 
                                  finish, dimension, length, color...
                     → BUT the old SPEC_PRIORITY is used elsewhere
```

The dynamic discovery IS working, but the old system is limiting what fields are discovered initially OR `ProductPicker` is bypassing filter-step entirely for some categories.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/po-wizard-v2/ProductPicker.tsx` | Remove `getFilterSequence` checks - always go to filter-step |
| `src/types/poWizardV2.ts` | Keep `SPEC_PRIORITY` and `getFilterSequence` for now (can deprecate later) |

---

## Technical Changes

### `src/components/po-wizard-v2/ProductPicker.tsx`

**1. Remove import of `getFilterSequence` (line 15)**

Remove it from the imports since we won't use it anymore.

**2. Update `handleCategorySelect` (lines 269-292)**

Always go to `filter-step` after selecting secondary (or if single secondary):

```typescript
const handleCategorySelect = useCallback(async (virtualKey: string) => {
  setSelectedVirtualCategory(virtualKey);
  setAppliedFilters({});
  
  const virtual = VIRTUAL_CATEGORIES[virtualKey];
  if (!virtual) return;
  
  // Fetch secondary categories for this virtual category
  const secondaries = await fetchSecondaryCategories(virtualKey);
  
  if (secondaries && secondaries.length > 1) {
    // Multiple sub-categories - show selection
    setStep('secondary');
  } else if (secondaries && secondaries.length === 1) {
    // Auto-select single secondary, then go to filter-step
    const secondary = secondaries[0].secondary_category;
    setSelectedSecondary(secondary);
    setStep('filter-step'); // ALWAYS go to filter-step
  } else {
    // No secondary categories - go to filter-step
    setStep('filter-step'); // ALWAYS go to filter-step
  }
}, [supplierId]);
```

**3. Update `handleSecondarySelect` (lines 295-313)**

Always go to `filter-step`:

```typescript
const handleSecondarySelect = useCallback((secondary: string) => {
  setSelectedSecondary(secondary);
  setAppliedFilters({});
  setStep('filter-step'); // ALWAYS go to filter-step
}, [selectedVirtualCategory, supplierId]);
```

**4. Update `handleBack` case for 'products' (lines 357-367)**

Always go back to filter-step from products:

```typescript
case 'products':
  // Always go back to filter-step
  setStep('filter-step');
  break;
```

---

## Updated Flow

```text
User selects: EXTERIOR TRIM
└── Secondary: SIDING (48 items)
    └── ALWAYS → StepByStepFilter (dynamic discovery)
        └── Step 1: Manufacturer (HARDIE)
            └── Step 2: Use Type (FIBER CEMENT)
                └── Step 3: Product Type (LAP, PANEL, BEADED...)
                    └── Step 4: Finish (PRIMED, CEDAR MILL...)
                        └── Step 5: Dimension (5/16"x8-1/4"...)
                            └── Step 6: Length (12ft, 16ft...)
                                └── Step 7: Color (if any)
                                    └── Product List
```

---

## StepByStepFilter Already Works Correctly

The `StepByStepFilter` component already has the correct logic:

1. `discoverFilterSequence()` - Finds ALL fields with `size >= 1`
2. Sorts by `FILTER_PRIORITY` (manufacturer first, then use_type, etc.)
3. Shows every step (no auto-skipping)

The only fix needed is to make `ProductPicker` **always** route to `StepByStepFilter`.

---

## Summary of Changes

Remove these 4 occurrences of the old `getFilterSequence` check in `ProductPicker.tsx`:

| Location | Current Code | New Code |
|----------|--------------|----------|
| Line 275-282 | Check `filterSeq.length > 0` | Always `setStep('filter-step')` |
| Line 285-291 | Check `filterSeq.length > 0` | Always `setStep('filter-step')` |
| Line 303-312 | Check `filterSeq.length > 0` | Always `setStep('filter-step')` |
| Line 359-367 | Check `filterSeq.length > 0` | Always `setStep('filter-step')` |
