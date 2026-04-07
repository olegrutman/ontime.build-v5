

# Require At Least One Scope Item When Creating a Change Order

## Problem

The wizard's `canAdvance()` function on the "How" step does not check if any scope items have been selected. Users can create a CO with zero line items, which produces an empty CO.

## Changes

### File: `src/components/change-orders/wizard/COWizard.tsx`

1. **Update `canAdvance()` for the "how" step** — add `data.selectedItems.length === 0` as a blocking condition for TC and FC roles (who have the scope picker on this step). For GC, scope items are added after creation via `AddScopeItemButton`, so GC can proceed without items.

2. **Add a helper message** — show a small hint below the scope picker when no items are selected: "Select at least one item to continue".

3. **Also gate the final "Create" button** — add a check so that regardless of role, the submit button on the last step requires `data.selectedItems.length > 0`. This covers GC too (GC has a scope picker via StepCatalog on the "how" step if one exists, or we add one).

Wait — let me re-check: does the GC flow have a scope picker?

Looking at the code: GC's `StepHow` (lines 507-556) does NOT include a `ScopePicker`. Only TC (line 585) and FC have it. So GC creates the CO shell and adds items after via `AddScopeItemButton`.

**Decision**: Require at least one scope item for TC and FC on the "how" step. For GC, also add the `ScopePicker` component so they can select initial items during creation.

### Specific code changes:

**`canAdvance()` (line 125-135):**
- For `how` step: add `if (data.selectedItems.length === 0) return false;` for all roles

**GC's `StepHow` (lines 507-556):**
- Add the `ScopePicker` component (same as TC/FC) so GC can also select scope items during creation

**`ScopePicker` component:**
- Add a validation hint when no items are selected: "Select at least one scope item"

## Files Changed

| File | Change |
|------|--------|
| `src/components/change-orders/wizard/COWizard.tsx` | Add scope item requirement to `canAdvance()`; add `ScopePicker` to GC flow; add validation hint |

