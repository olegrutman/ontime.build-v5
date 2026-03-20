

## Add Review Step to CO Wizard

Add a 5th "Review" step after Scope that shows a full summary of all entered data before the user creates the change order.

### Changes

**1. New file: `src/components/change-orders/wizard/StepReview.tsx`**
- Summary card showing:
  - **Reason**: reason code label + reason note (if any)
  - **Configuration**: pricing type, NTE cap (if applicable), assigned org name, materials/equipment flags and responsibilities, FC input toggle
  - **Location**: all location tags joined
  - **Scope**: list of selected work items with division/category
  - **Title** (if manually entered)
  - Share draft toggle state
- Read-only display using a clean card layout with section headers and muted labels
- Each section is a small block with icon + heading consistent with wizard styling

**2. Edit: `src/components/change-orders/wizard/COWizard.tsx`**
- Add `{ key: 'review', label: 'Review', description: 'Confirm before creating' }` as the 5th step in `ALL_STEPS`
- Import and render `StepReview` when `currentStep.key === 'review'`
- Move "Create Change Order" button logic to appear only on the review step (currently on catalog step)
- `canAdvance()` for the catalog step returns true when items selected (no longer final step), review step always valid
- Pass `projectId` to StepReview so it can look up org name for `assigned_to_org_id`

### No database changes needed

