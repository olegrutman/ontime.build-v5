

# Bug Fix: Screen Goes Dark After Selecting Task in Quick Log

## Root Cause

In `QuickLogView.tsx` (line 91-100), the `QuickLogMobileSheet` Drawer is rendered with `open={!!selectedItem}`. When a user selects a catalog item on desktop:

1. `selectedItem` becomes non-null → `open={true}`
2. The Drawer renders its **overlay** (`fixed inset-0 bg-black/80`) — this is the dark screen
3. The `DrawerContent` has `lg:hidden`, so the actual sheet content is invisible on desktop
4. Result: black overlay covers the entire page with no way to interact

The desktop detail panel (`hidden lg:block`) shows correctly, but the mobile drawer overlay blocks it.

## Fix

**File: `src/components/quick-log/QuickLogView.tsx`**

Use the `useIsMobile` hook (already exists at `src/hooks/use-mobile.tsx`, breakpoint 768px) to conditionally render the mobile sheet only on mobile viewports. On desktop, only the sticky right-column detail panel should be used.

- Import `useIsMobile`
- Only pass `open={!!selectedItem}` to the mobile sheet when `isMobile` is true
- On desktop, the sticky detail panel already handles the selected item display

**Secondary fix: `QuickLogMobileSheet.tsx`**

Remove `lg:hidden` from `DrawerContent` — it's unnecessary if we gate rendering properly, and it causes the overlay-without-content bug if the drawer ever opens on desktop.

## Additional Bugs Found

1. **Console warning**: `QuickLogDetailPanel` passes a ref to the `Select` component which doesn't support `forwardRef`. Non-breaking but noisy — suppress by not passing ref.

2. **Missing `DialogDescription`**: Console warns about missing `Description` or `aria-describedby` on dialogs — add `DrawerDescription` with `sr-only` class to `SubmitAllSheet` if it uses a Dialog.

