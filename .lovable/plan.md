

# Fix PO Wizard: Auto-open Materials, Double X, and Pack Navigation

## Issues Found

1. **After PO Details, user must manually open the Add Materials screen** -- When advancing from the Header screen to the Items screen, the user sees an empty state and must tap "Add First Item". Instead, the ProductPicker should auto-open.

2. **Two X buttons in the top-right corner** -- The parent PO wizard (`Dialog`/`Sheet`) has a default close button from `DialogContent`, and the `ProductPicker` overlay adds its own X button. Both are visible simultaneously, confusing the user.

3. **Can't go back to pack list after selecting a pack** -- When viewing the Packs tab inside the ProductPicker and selecting a pack, `handleClose()` is called which fully closes the picker. The user cannot navigate back to browse other packs without clicking "Change Pack" on the Items screen (which clears all loaded items first).

---

## Fix 1: Auto-open ProductPicker on Items Screen

**File: `src/components/po-wizard-v2/POWizardV2.tsx`**

When the screen transitions from `header` to `items` and there are no line items yet, automatically set `pickerOpen` to `true`. This skips the empty state and takes the user directly to the Add Materials flow.

- In the `onNext` handler (or via a `useEffect` watching `screen`), when `screen` becomes `items` and `formData.line_items.length === 0`, set `setPickerOpen(true)`.

## Fix 2: Remove Duplicate X Button

**File: `src/components/po-wizard-v2/POWizardV2.tsx`**

Hide the default `DialogContent` close button on the parent wizard dialog by adding the Radix `hideCloseButton` approach (adding a custom class or using the `[&>button]:hidden` trick on the `DialogContent` to suppress the built-in X). The ProductPicker's own X and back buttons handle closing/navigation already.

Alternatively, check the `dialog.tsx` component -- if it renders a default `DialogClose` / X button, suppress it via a prop or className override on the POWizardV2's `DialogContent`.

## Fix 3: Pack Navigation -- Back to Pack List

**File: `src/components/po-wizard-v2/ProductPicker.tsx`**

The problem: selecting a pack calls `handleClose()` which fully closes the picker. The user can't browse other packs.

The fix:
- After loading a pack, instead of calling `handleClose()`, just close the picker via `onOpenChange(false)` but keep the `step` state. When the picker is re-opened (via "Change Pack" or "Add Another Item"), it should return to the `estimate` step if items were loaded from a pack.
- Update the `handleBack` for the `estimate` step: currently it goes to `source`. This is correct. The real issue is that the picker's X button calls `handleClose` which resets everything. Instead, the X on the picker should just close the modal overlay without resetting state, so re-opening brings the user back to where they were.

Specifically:
- In `ProductPicker`, split "close" into two behaviors:
  - **X button**: just close the overlay (`onOpenChange(false)`) without resetting step/state
  - **Full reset**: only happens when the parent wizard resets (dialog opens fresh)
- When the picker opens again and the parent already has pack items loaded, start at the `estimate` step so the user can browse packs again

---

## Files Modified

```
src/components/po-wizard-v2/POWizardV2.tsx       -- Auto-open picker, hide duplicate X
src/components/po-wizard-v2/ProductPicker.tsx     -- Fix pack navigation, split close behavior
```

