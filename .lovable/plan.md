

# Wizard Summary + SOV Becomes Official Project SOV

## What Changes

### 1. Add Summary Step to Wizard
Replace the current minimal "Review" step with a proper summary screen showing all user selections grouped by section: building type, contract value, floors, material responsibility, basement details, roof, envelope, backout, exterior, etc. Each answer displayed in a clean card layout so the user can review everything before saving.

### 2. Remove Contracts Card from Setup Flow
Delete the `PhaseContracts` card (Step 2) from `ProjectSetupFlow.tsx`. The contract value entered in the wizard (`contract_value` answer) becomes the single source of truth. On save, upsert a `project_contracts` row with that value so downstream features (invoicing, overview KPIs) still work.

### 3. Save Wizard SOV Lines as Official `project_sov` + `project_sov_items`
Update the `save()` mutation in `useSetupWizardV2.ts` to:
- Create a `project_sov` record (or update existing) for the project
- Insert each wizard `SOVLine` as a `project_sov_items` row with `percent_of_contract`, `value_amount`, `scheduled_value`, `item_name`, `item_group` (phase label), `sort_order`, `source: 'wizard_v2'`, `scope_section_slug` (from `conditionalKey`)
- Delete any previous wizard-generated SOV items before re-inserting

### 4. Show Editable SOV Card After Setup Completes
Replace the old `PhaseSOV` card in `ProjectSetupFlow.tsx` with the existing `ContractSOVEditor` component (already supports inline editing of names, percentages, amounts, reordering, locking). This card unlocks immediately after setup completes since the SOV already exists. Remove the "contracts must exist" gate — the wizard handles everything.

### 5. Simplified Setup Flow Layout
After changes, `ProjectSetupFlow.tsx` has two cards:
1. **Project Setup** — the wizard (building type → questions → summary → save)
2. **Schedule of Values** — `ContractSOVEditor` showing saved lines, editable, lockable

The "Finish Setup & Activate Project" button stays on the SOV card, gated on the SOV being locked.

## Files Changed

| File | Change |
|------|--------|
| `src/hooks/useSetupWizardV2.ts` | Expand `save()` to create `project_sov` + `project_sov_items` rows and upsert `project_contracts` with contract value |
| `src/components/setup-wizard-v2/SetupWizardV2.tsx` | Replace review step with full summary showing all answers by section |
| `src/components/project-setup/ProjectSetupFlow.tsx` | Remove Contracts card; simplify to Setup + SOV editor; remove contract gate logic |
| `src/components/project-setup/PhaseSOV.tsx` | Simplify — remove contract prerequisite checks since SOV already exists after wizard save |

