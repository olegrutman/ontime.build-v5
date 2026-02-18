

# Fix: RFI to Work Order Data Not Transferring

## Root Cause

The `WorkOrderWizard` component is permanently mounted inside `RFIsTab`. React's `useState` only uses its initial value on the **first render**. When the user clicks "Convert to Work Order", `woInitialData` state updates but the wizard's internal `formData` state was already initialized with the empty default -- it never picks up the new value.

## Fix

**File: `src/components/work-order-wizard/WorkOrderWizard.tsx`**

Add a `useEffect` that resets `formData` and `currentStep` whenever `open` transitions to `true`. This ensures every time the wizard opens, it picks up the latest `initialData`.

```text
useEffect:
  when `open` becomes true:
    setFormData({ ...INITIAL_WIZARD_DATA, ...initialData })
    setCurrentStep(1)
```

This is a single small change -- add a `useEffect` with dependencies `[open, initialData]` that runs the reset logic when the dialog opens. No other files need changes.

