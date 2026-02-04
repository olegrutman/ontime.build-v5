
# Plan: Skip Filter Steps with Null Values

## Summary

Modify the filter logic to **automatically skip** steps where all database values are null (i.e., no selectable options exist). This will only skip steps that have no data - steps with 1+ values will still be shown for explicit confirmation.

---

## Key Change

After fetching filter values for a step, if the result is empty (all null), automatically advance to the next step instead of showing "No options available."

---

## File to Modify

| File | Changes |
|------|---------|
| `src/components/po-wizard-v2/StepByStepFilter.tsx` | Add auto-skip when `availableValues` is empty after fetch |

---

## Technical Changes

### `src/components/po-wizard-v2/StepByStepFilter.tsx`

**Update `fetchFilterValues` (around line 162)**

After setting `availableValues`, check if empty and auto-advance:

```typescript
// Current code (line 162):
setAvailableValues(values);
// No auto-advance - always show the step so user confirms each selection

// New code:
setAvailableValues(values);

// Auto-skip if all values are null (no selectable options)
if (values.length === 0) {
  // Skip to next step or complete if last step
  if (currentStepIndex >= totalSteps - 1) {
    onComplete(appliedFilters);
  } else {
    setCurrentStepIndex(prev => prev + 1);
  }
  return; // Exit early, don't set loading to false yet
}
```

---

## Updated Flow

```text
User selects: EXTERIOR TRIM → SIDING

Step 1: Manufacturer (HARDIE - 48) → User selects
Step 2: Use Type (all null) → AUTO-SKIP ✓
Step 3: Product Type (LAP, PANEL...) → User selects
Step 4: Finish (SMOOTH, WDGRN...) → User selects
Step 5: Color (all null) → AUTO-SKIP ✓
Step 6: Dimension → User selects
Step 7: Length → User selects
→ Product List
```

---

## Logic Summary

| Scenario | Behavior |
|----------|----------|
| Field has 2+ values | Show step, user must select |
| Field has 1 value | Show step, user confirms by tapping |
| Field has 0 values (all null) | **Auto-skip to next step** |

This keeps the explicit confirmation for steps with data while efficiently skipping empty steps.
