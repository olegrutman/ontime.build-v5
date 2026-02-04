

# Fix: Product Picker Filter Steps Not Working

## Root Cause Analysis

After testing the picker, I discovered a **race condition** in `StepByStepFilter.tsx` that causes filters to be skipped:

### The Race Condition

1. Component mounts with `filterSequence = []` (empty array)
2. Two `useEffect` hooks run in parallel:
   - **Effect 1** (lines 85-101): Calls `discoverFilterSequence()` to find available filters
   - **Effect 2** (lines 167-169): Calls `fetchFilterValues()` 
3. `fetchFilterValues` runs **before** filter discovery completes
4. Since `filterSequence.length === 0` and `currentField` is undefined, it triggers `onComplete({})` immediately
5. This bypasses all filtering and goes directly to the product list

### Secondary Issue

The `discoveryDone.current` ref is never reset when the component receives new props, meaning subsequent uses might also fail.

---

## Solution

### File: `src/components/po-wizard-v2/StepByStepFilter.tsx`

**1. Add a "discovery loading" state to prevent premature completion**

```typescript
// Add new state to track if discovery is complete
const [discoveryComplete, setDiscoveryComplete] = useState(false);
```

**2. Update discovery useEffect to set the flag**

```typescript
useEffect(() => {
  if (!supplierId || !category) return;
  
  // Reset for new props
  discoveryDone.current = false;
  setDiscoveryComplete(false);
  setCurrentStepIndex(0);
  setAppliedFilters({});
  
  discoveryDone.current = true;
  discoverFilterSequence(supplierId, category, secondaryCategory)
    .then(sequence => {
      if (sequence.length === 0) {
        onComplete({});
      } else {
        setFilterSequence(sequence);
        setDiscoveryComplete(true); // ← Mark discovery as done
      }
    })
    .catch(() => {
      onComplete({});
    });
}, [supplierId, category, secondaryCategory, onComplete]);
```

**3. Guard `fetchFilterValues` to wait for discovery**

```typescript
const fetchFilterValues = useCallback(async () => {
  // Don't run until discovery is complete
  if (!discoveryComplete || !supplierId || !category || !currentField) {
    return;
  }
  // ... rest of function
}, [discoveryComplete, supplierId, category, secondaryCategory, currentField, appliedFilters]);
```

**4. Update the useEffect that triggers fetching**

```typescript
useEffect(() => {
  if (discoveryComplete && currentField) {
    fetchFilterValues();
  }
}, [discoveryComplete, fetchFilterValues, currentField]);
```

**5. Show loading while discovery is in progress**

Update the loading state to include discovery:

```typescript
if (loading || !discoveryComplete) {
  return (
    <div className="flex flex-col h-full">
      // ... loading skeleton
    </div>
  );
}
```

---

## Expected Flow After Fix

```text
User selects: EXTERIOR TRIM
└── Secondary: SIDING (48 items)
    └── StepByStepFilter mounts
        └── discoverFilterSequence() runs
            └── Finds: manufacturer, use_type, product_type, finish, dimension, length
                └── Sets discoveryComplete = true
                    └── fetchFilterValues() runs
                        └── Step 1: Select Manufacturer (HARDIE)
                            └── Step 2: Select Use Type (FIBER CEMENT)
                                └── Step 3: Select Product Type (LAP, PANEL, SHINGLE...)
                                    └── Step 4: Select Finish (SMOOTH, WDGRN...)
                                        └── Step 5: Select Dimension
                                            └── Step 6: Select Length
                                                └── Product List (narrowed down)
```

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Line ~71 | Add `discoveryComplete` state |
| Lines 85-101 | Reset state for new props, set `discoveryComplete` after discovery |
| Line ~105-111 | Guard with `discoveryComplete` check |
| Lines 167-169 | Only fetch when `discoveryComplete && currentField` |
| Line 224 | Include `!discoveryComplete` in loading check |

This fix ensures that:
1. Filter discovery **completes before** we try to fetch values
2. The component properly resets when used with different category/secondary
3. No race conditions cause premature `onComplete({})` calls

