
# Plan: Never Skip Filter Steps - Use All Available Fields

## Summary

Modify the filter logic to **never skip steps** and **use every field with data** to narrow down product selection as much as possible. The picker should continue filtering until the product count is small enough to browse.

---

## Key Changes

### 1. Remove the "2+ values" requirement

**Current behavior**: Only shows filter steps for fields with 2 or more distinct values.

**New behavior**: Show filter steps for ALL fields that have any non-null values, even if there's only 1 option. This ensures users see every attribute of the products they're selecting.

### 2. Remove auto-advance/auto-skip logic

**Current behavior**: If a field has 0 values, skip to next step. If 1 value, auto-select and skip.

**New behavior**: Always show the step. If there's only 1 option, show it as a confirmation step - user must tap to proceed. If 0 values, show that step with a "Continue" option.

### 3. Keep filtering until products are manageable

Instead of stopping after a few filters, continue through ALL applicable fields to get the product count as low as possible.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/po-wizard-v2/StepByStepFilter.tsx` | Remove skip logic, include all fields with data |

---

## Technical Changes

### `src/components/po-wizard-v2/StepByStepFilter.tsx`

**1. Update `discoverFilterSequence` function (lines 57-60)**

Change from requiring 2+ values to requiring 1+ values:

```typescript
// Before: filter to fields with 2+ distinct values
.filter(field => fieldCounts[field].size >= 2)

// After: include ALL fields with any data
.filter(field => fieldCounts[field].size >= 1)
```

**2. Remove auto-advance logic (lines 160-167)**

Remove the automatic skipping of steps with 0 or 1 values:

```typescript
// Before: auto-skips steps
if (values.length === 0) {
  handleAdvanceToNextStep();
} else if (values.length === 1) {
  handleSelectValue(values[0].value);
}

// After: always show the step - no auto-skipping
// (remove these lines entirely)
```

**3. Handle single-value steps gracefully**

When there's only 1 option, still show it as a selectable button so the user confirms their selection explicitly.

---

## Updated Flow Example: Exterior > SIDING

```text
User selects: EXTERIOR TRIM
└── Secondary: SIDING (48 items)

Step 1: Manufacturer
├── HARDIE (48)
└── User selects HARDIE

Step 2: Use Type  
├── FIBER CEMENT (48)
└── User selects FIBER CEMENT (confirms)

Step 3: Product Type
├── LAP (23)
├── PANEL (15)
├── SHINGLE (6)
└── BEADED (4)
└── User selects LAP (23 items remaining)

Step 4: Finish
├── PRIMED (12)
├── CEDAR MILL (8)
├── SMOOTH (3)
└── User selects PRIMED (12 items)

Step 5: Dimension
├── 5/16"x8-1/4" (6)
├── 5/16"x6-1/4" (4)
├── 5/16"x12" (2)
└── User selects 5/16"x8-1/4" (6 items)

Step 6: Length
├── 12ft (4)
├── 16ft (2)
└── User selects 12ft (4 items)

→ Product List (4 products to choose from)
```

---

## Same Approach for All Categories

This logic applies universally:

| Category | Filter Sequence (all available fields in priority order) |
|----------|-----------------------------------------------------------|
| Exterior | manufacturer → use_type → product_type → finish → dimension → length → depth |
| Decking | manufacturer → color → dimension → length |
| FramingLumber | wood_species → dimension → length → finish |
| Engineered | use_type → product_type → depth → width → length |
| Hardware | thickness → length |
| Sheathing | use_type → product_type → thickness → dimension |
| Structural | product_type → depth → width → thickness → dimension |

The dynamic discovery ensures that whatever fields have data will be included - no manual configuration needed per category.

---

## Benefits

1. **No skipped steps**: Users see every filter, confirming each attribute
2. **Maximum narrowing**: Continue filtering until product list is small
3. **Explicit confirmation**: Even single-option steps require a tap
4. **Works for all categories**: Same logic applies everywhere
5. **Data-driven**: Automatically adapts when catalog data changes
