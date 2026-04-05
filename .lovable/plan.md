

# Test & Fix: Project Setup Pipeline — End-to-End Audit

## Bugs Found

### Bug 1: Duplicate Contract Fields (Critical UX Issue)
Phase 5 of the setup questionnaire has `contract_sum` and `retainage_percent` fields in the "Contract Terms" section. These are **also** shown in the standalone `PhaseContracts` card below the wizard. The user sees two places to enter the same data — confusing and error-prone. Worse, the Phase 5 fields save to `project_setup_answers` (a generic key-value store) while the Contracts card saves to `project_contracts` (the actual table used by SOV/financials). **The Phase 5 fields are decorative — they don't drive anything.**

**Fix**: Remove `contract_sum` and `retainage_percent` from `setup_questions` (Phase 5), OR hide them in the UI by filtering them out in `SetupWizardShell`. The real contract entry happens in the `PhaseContracts` card which writes to `project_contracts`. Keep the other Phase 5 fields (billing_period_type, lien_waiver_type, prevailing_wage, etc.) — those are project-level settings, not per-contract values.

### Bug 2: Phase 5 Contract Fields Are Project-Level, Not Per-Contract
`contract_sum` is a per-party value (each TC has a different contract sum), but the Phase 5 question renders a single currency input. This doesn't match reality — a project has multiple contracts with different sums. The `PhaseContracts` card already handles this correctly with a per-team-member table.

**Fix**: Same as Bug 1 — remove `contract_sum` and `retainage_percent` from setup_questions. The remaining Phase 5 fields (`billing_period_type`, `lien_waiver_type`, `prevailing_wage`, `material_responsibility`, `mobilization`, `warranty`, etc.) are genuinely project-level and belong in the questionnaire.

### Bug 3: Initial Project Creation Missing Building Types
`PROJECT_TYPES` in `projectWizard.ts` only offers 5 types: `Single Family Home`, `Apartments/Condos`, `Townhomes`, `Duplex`, `Hotels`. But the setup engine supports 8 types (`Multifamily 3-5`, `Multifamily 6+`, `Mixed-Use`, `Senior Living`, `Hospitality`, `Industrial`, `Townhome`, `Single Family`). Users creating a senior living or industrial project can't select the right type at creation.

**Fix**: Expand `PROJECT_TYPES` to include all 8 building types that the setup engine supports. Update the display labels to be user-friendly.

### Bug 4: Project Type Mapping Mismatch
The initial wizard stores `"Apartments/Condos"` as `project_type` but the setup engine expects to map this to a slug. The current `SLUG_MAP` handles this, but `"Duplex"` maps to `townhome` — which may show wrong questions. Should `Duplex` be its own type or is `townhome` correct?

**Fix**: Align creation types 1:1 with setup engine slugs. Remove ambiguous mappings by making the project type dropdown use the same display names as the setup engine's `building_type` options.

### Bug 5: `setActiveSectionIdx` Called During Render
In `SetupWizardShell.tsx` lines 105-107, `setActiveSectionIdx` is called directly in the render body (not in a `useEffect`). This triggers a React warning and potential infinite re-render loop.

**Fix**: Wrap the clamping logic in a `useEffect`.

## Implementation Plan

### Step 1: Remove duplicate contract fields from setup_questions
Run a migration to delete `contract_sum` and `retainage_percent` rows from `setup_questions`. This eliminates the confusing duplicate entry points.

### Step 2: Align project types between creation wizard and setup engine
Update `PROJECT_TYPES` in `projectWizard.ts` to match the 8 building types the engine supports. Use the same display names so no slug mapping is needed at creation time.

Update `SLUG_MAP` in `ProjectSetupFlow.tsx` to handle the new type names.

### Step 3: Fix render-time setState in SetupWizardShell
Move the section index clamping (lines 105-107) into a `useEffect`.

### Step 4: Simplify the Project Info page layout
Rename Phase 5 from "Contract & Scope" to "Terms & Scope" since the per-contract dollar values now only live in the Contracts card. This makes it clear that Phase 5 is about project-level policies (billing periods, warranties, mobilization) while the Contracts card below handles per-party financials.

### Files Changed

| File | Change |
|------|--------|
| **DB migration** | Delete `contract_sum` and `retainage_percent` from `setup_questions` |
| `src/types/projectWizard.ts` | Expand `PROJECT_TYPES` to all 8 building types |
| `src/components/project-wizard-new/BasicsStep.tsx` | No change needed (reads from `PROJECT_TYPES`) |
| `src/components/project-setup/ProjectSetupFlow.tsx` | Update `SLUG_MAP` for new type names |
| `src/components/setup-engine/SetupWizardShell.tsx` | Fix render-time setState; rename Phase 5 label |

### What is NOT Changing
- `PhaseContracts.tsx` — already works correctly for per-party contract entry
- `PhaseSOV.tsx` — reads from `project_contracts`, unaffected
- `useSetupQuestions.ts` — hook logic is fine
- `QuestionField.tsx` — all input types render correctly
- RLS policies, database schema (except deleting 2 question rows)

