

# Bug Fix: Catalog PO Creation Fails — Wizard Closes Prematurely

## Root Cause

When a user adds a catalog item via the QuantityPanel, the panel calls `onClose()` after adding the item. This `onClose` is wired to the wizard's `handleClose`, which **closes the entire wizard dialog**. The item gets added to `formData` in memory, but the dialog unmounts before the user can reach the Review screen and submit the PO.

The pack flow works because it uses `onExitPicker()` (which navigates to the items screen) instead of `onClose`.

## Flow Trace

```text
QuantityPanel.handleSubmit()
  → onAdd(item)         // adds item to formData ✓
  → onClose()           // ← BUG: calls wizard's handleClose()
    → setScreen('header')
    → onOpenChange(false)  // closes the dialog — PO never created
```

## Fix

In `ProductPicker.tsx`, change the `onClose` prop passed to `QuantityPanel` from `onClose` (wizard close) to a handler that navigates back within the picker instead:

| File | Change |
|---|---|
| `src/components/po-wizard-v2/ProductPicker.tsx` | Pass `onExitPicker` instead of `onClose` to QuantityPanel's `onClose` prop, so adding a catalog item returns to the items screen instead of closing the wizard |

The QuantityPanel calls `onClose()` after `onAdd(item)`, but `handleAddItem` in the wizard already sets `screen: 'items'`. So the QuantityPanel's `onClose` just needs to be a no-op or redundantly go to items — using `onExitPicker` achieves this cleanly.

