
# Replace Add Scope Item Wizard with V3 Picker

## Problem
The "Add item" button on the CO detail page opens an old 4-step wizard (`AddScopeItemButton`) instead of the V3 Picker (`PickerShell`) that's used for creating new COs. The user wants the same V3 experience when adding scope items to an existing CO.

## Approach
Navigate the user to the V3 Picker in an **"add-to-existing"** mode. When in this mode, the picker skips CO creation and instead inserts line items, materials, equipment, and labor directly into the existing CO.

## Implementation

### 1. Add route for "add items to existing CO"
- New route: `/project/:id/change-orders/:coId/add-items`
- Renders `COPickerV3Page` with the `coId` param available

### 2. Extend PickerShell with `addToCoId` prop
- When `addToCoId` is provided, the picker operates in "add mode":
  - **Skip steps that are already set on the parent CO**: Who (step 3) — the CO already has assignment. Pricing (step 4) — already set.
  - **Pre-populate**: Location from existing CO's `location_tag`, reason from CO's `reason`.
  - **Submit behavior**: Instead of creating a new CO, insert `co_line_items`, `co_labor_entries`, `co_material_items`, `co_equipment_items` into the existing CO.
  - **Header**: Shows "Add Items to CO-XXX" instead of "New Change Order".
  - **Success screen**: Shows "Items Added" with a "Back to CO" button instead of "Back to List".

### 3. Replace AddScopeItemButton usage
- In `CODetailLayout.tsx`, replace the `<AddScopeItemButton>` with a simple `<Button>` that navigates to the new route.

### 4. Clean up
- Remove `AddScopeItemButton.tsx` (now unused).
- Remove the old wizard components it imported if they're only used by it (`StepCatalog` from `./wizard/StepCatalog`).

## Technical Details

**Modified files:**
- `src/App.tsx` — add route `/project/:id/change-orders/:coId/add-items`
- `src/pages/COPickerV3.tsx` — pass `coId` param to `PickerShell` when present
- `src/components/change-orders/picker-v3/PickerShell.tsx` — add `addToCoId` prop, modify submit to insert into existing CO, adjust header/success screen
- `src/components/change-orders/CODetailLayout.tsx` — replace `AddScopeItemButton` with navigation button

**Deleted files:**
- `src/components/change-orders/AddScopeItemButton.tsx`
