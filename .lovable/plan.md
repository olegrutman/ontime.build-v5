

# Add Dedicated "Scope" Step to CO Wizard

## Problem

The scope item picker is currently buried inside the "How" step alongside pricing, assignments, and toggles. It should be its own wizard step so users have a clean, focused page to search and select scope items.

## Changes

### File: `src/components/change-orders/wizard/COWizard.tsx`

1. **Add a new step** to the `STEPS` array between "Where" and "How":
   ```
   Why → Where → Scope → How → Team
   ```
   New entry: `{ key: 'scope', label: 'Scope', description: 'Select work items' }`

2. **Create `StepScope` component** — extracts the `ScopePicker` logic (search, toggle, catalog query, selectedIds) out of `StepHow` into a standalone step component. Uses full height for the item grid (no `max-h-[300px]` constraint since it has the whole page).

3. **Remove `ScopePicker` from all three role views in `StepHow`** (GC lines ~556-563, TC lines ~596-603, FC lines ~644-651). The "How" step becomes purely about pricing, assignments, and toggles.

4. **Update `canAdvance()`**:
   - New `scope` step: `return data.selectedItems.length > 0`
   - `how` step: remove the `selectedItems.length === 0` check (already validated on previous step)

5. **Update step rendering** — add `{currentStep.key === 'scope' && <StepScope ... />}` in the content area.

### What is NOT changing
- Database, RLS, submission logic, other steps
- The `ScopePicker` UI itself (search + grid + selection count) stays the same, just moved to its own step

