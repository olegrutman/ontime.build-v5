

# Wire New Setup Engine into Project Info

## Problem

The setup wizard renders empty because the `SLUG_MAP` in `ProjectSetupFlow.tsx` doesn't handle actual `project_type` values from the database. The project has `project_type = "Apartments/Condos"` but the map only has keys like `apartment`, `mf_3to5` — so it falls through to the raw string `"Apartments/Condos"`, which doesn't match any key in `options_by_type` JSONB, and zero questions render.

## Fix

### 1. Fix slug mapping in `ProjectSetupFlow.tsx`

Add the actual `project_type` display names from the `projects` table to `SLUG_MAP`:

```
'Apartments/Condos' → 'mf_3to5'
'Single Family Home' → 'custom_home'
'Townhomes'         → 'townhome'
'Duplex'            → 'townhome'
'Hotels'            → 'hotel'
```

This is the primary fix — once the slug maps correctly, all 99 questions will filter and render by building type.

### 2. Pre-populate Phase 1 answers from existing project data

When the wizard loads, if `project_setup_answers` is empty for this project, seed Phase 1 fields from the `projects` table so users don't re-enter data they already provided during project creation:

- `name` ← `project.name`
- `address` ← `project.address`
- `building_type` ← mapped display name (e.g., "Multifamily 3-5")
- `start_date` ← `project.start_date`
- `status` ← `project.status`

This runs once on mount via an effect in `ProjectSetupFlow.tsx`.

### 3. Fix `QuestionField.tsx` edge cases

Currently `QuestionField` checks `options_by_type` for dropdown/multi-select but the data stores strings like `"Free text"` for text fields. The `getOptions` function already returns `null` for non-array values, but the dropdown renderer may show an empty select if it receives an unexpected string. Add a guard: if `input_type` is `text`, `textarea`, `date`, `currency`, `number`, or `percentage`, skip option fetching entirely.

### Files changed

| File | Change |
|------|--------|
| `ProjectSetupFlow.tsx` | Expand `SLUG_MAP` with display-name keys; add effect to seed Phase 1 answers from project record |
| `QuestionField.tsx` | Guard against non-array option values for non-select input types |

### What is NOT changing
- Database schema, RLS policies
- `useSetupQuestions.ts` hook logic
- `SetupWizardShell.tsx` navigation
- `DynamicSection.tsx`
- Contracts and SOV cards

