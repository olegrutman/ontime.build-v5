

## Add estimate browsing to CO materials picker

**Problem**: When adding materials from the CO detail page, users can only browse the full catalog. The PO wizard already supports choosing between "Project Estimate" and "Full Catalog" via the `hasApprovedEstimate` prop on `ProductPickerContent`, but the CO materials panel doesn't pass this prop.

**Fix** (`src/components/change-orders/COMaterialsPanel.tsx`):

1. **Check for approved estimates** — Add a `hasApprovedEstimate` state and a `useEffect` that calls the same `checkApprovedEstimate` logic (query `supplier_estimates` for `APPROVED` status matching the project + supplier). Run this when `supplierId` and `projectId` are available.

2. **Pass the prop to ProductPickerContent** — Add `hasApprovedEstimate={hasApprovedEstimate}` to the existing `<ProductPickerContent>` in the bottom sheet. This will automatically show the "source" step letting users choose between estimate packs and full catalog.

3. **No other changes needed** — `ProductPickerContent` already handles the estimate browsing flow, pack loading, and item selection internally. The `projectId` prop is already being passed.

### Files to change
- `src/components/change-orders/COMaterialsPanel.tsx` — add estimate check + pass `hasApprovedEstimate` prop

