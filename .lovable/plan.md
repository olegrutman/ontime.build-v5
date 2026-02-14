

# Fix Product Picker Back Button to Go Back One Step

## Problem

When inside the multi-step filter flow (StepByStepFilter), pressing the back chevron in the ProductPicker header jumps all the way out to the category or secondary selection. Users expect it to go back one filter step at a time (e.g., from "Select Length" back to "Select Dimension").

The internal logic already exists in `StepByStepFilter.handleBackStep` (line 229) -- it goes back one filter step, or calls `onBack` when at step 0. But the parent header button bypasses this entirely.

## Solution

Expose StepByStepFilter's back functionality via `useImperativeHandle` so the parent ProductPicker can delegate to it when the user taps the header back button during the filter-step phase.

## Changes

### 1. `src/components/po-wizard-v2/StepByStepFilter.tsx`

- Wrap with `forwardRef`
- Expose a `goBack()` method via `useImperativeHandle` that calls the existing `handleBackStep` logic

### 2. `src/components/po-wizard-v2/ProductPicker.tsx`

- Create a `ref` for StepByStepFilter and pass it when rendering
- In `handleBack`, when `step === 'filter-step'`, call `ref.current.goBack()` instead of jumping out

## Technical Details

```
StepByStepFilter:
  - Add forwardRef wrapper
  - useImperativeHandle exposes { goBack: handleBackStep }

ProductPicker:
  - const filterRef = useRef<{ goBack: () => void }>(null)
  - Pass ref={filterRef} to StepByStepFilter
  - handleBack case 'filter-step': filterRef.current?.goBack()
    (removes the current jump-to-secondary/category logic)
```

## What Is NOT Changed

- Filter discovery, skip logic, and auto-advance behavior
- Category and secondary selection flow
- Products and quantity steps
- No database changes

