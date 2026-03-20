

# Move Reason to Per-Item Description

## What changes

Currently "Reason" is a separate wizard step that sets one reason for the entire CO. Instead, each CO line item should carry its own reason and description — making the reason part of the item, not the CO header.

## Database migration

Add two columns to `co_line_items`:
- `reason TEXT` — stores the reason code (e.g. `'addition'`, `'rework'`)
- `description TEXT` — free-text description explaining why this item is on the CO

## Wizard changes

### Remove Reason step
- **`COWizard.tsx`**: Remove `{ key: 'reason' }` from `ALL_STEPS` (goes from 4 steps to 3: Configuration → Scope → Review). Remove `reason`/`reasonNote` from `COWizardData` and `INITIAL_DATA`. Remove `StepReason` import. Update `canAdvance()` to remove reason validation.

### Add reason + description to per-item flow in StepCatalog
- **`StepCatalog.tsx`**: After location picker and before "Add item" confirm button, add:
  1. A reason selector (same chip-style buttons from current `StepReason`) 
  2. A description textarea ("Describe why this item is needed")
  - Both stored in the pending-item state, then saved into `SelectedScopeItem`

### Update SelectedScopeItem type
- **`COWizard.tsx`**: Extend `SelectedScopeItem` to include `reason: COReasonCode` and `description: string`

### Update submission
- **`COWizard.tsx`** `handleSubmit`: Write `reason` and `description` per line item to `co_line_items` insert. Remove `reason`/`reason_note` from the `change_orders` insert (keep columns in DB but set to null — no destructive migration).

### Update "Add item" on detail page
- **`CODetailPage.tsx`**: The `AddScopeItemButton` dialog uses `StepCatalog` — it will automatically get the new reason+description fields since it reuses the same component.

### Update display
- **`COLineItemRow.tsx`**: Show reason badge + description text under each item name
- **`StepReview.tsx`**: Show per-item reason + description in the review summary

## Files changed

| File | Change |
|------|--------|
| **Migration** | Add `reason TEXT`, `description TEXT` to `co_line_items` |
| `COWizard.tsx` | Remove reason step, extend `SelectedScopeItem`, update submit |
| `StepCatalog.tsx` | Add reason chips + description textarea to per-item flow |
| `StepReview.tsx` | Show per-item reason and description |
| `CODetailPage.tsx` | No direct changes (inherits from StepCatalog) |
| `COLineItemRow.tsx` | Display reason badge + description |
| `changeOrder.ts` | Add `reason` and `description` to `COLineItem` interface |

`StepReason.tsx` is kept in the codebase (not deleted) in case it's reused elsewhere, but no longer imported by the wizard.

