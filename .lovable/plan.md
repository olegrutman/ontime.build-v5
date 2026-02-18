
# Add Inline "Activate Contract" Button to Readiness Card

## What Changes

When the "Contract mode selected" checklist item is incomplete, an inline "Activate" button will appear directly below it (same pattern as the material responsibility GC/TC buttons). Clicking it sets the first contract's status to `'Active'` and refreshes the checklist.

## Technical Changes

### `src/components/project/ProjectReadinessCard.tsx`

- Add a new handler `handleActivateContract` that updates `project_contracts.status` to `'Active'` for the `firstContractId`, then calls `recalculate()`.
- Below the `active_contract` checklist item (when incomplete and `firstContractId` exists), render an inline "Activate Contract" button styled consistently with the existing material responsibility buttons.

### No other file changes needed

- `firstContractId` is already exposed from the hook and available in the card component.
- The `project_contracts.status` column already accepts `'Active'` as a value.
- No database migration required.
