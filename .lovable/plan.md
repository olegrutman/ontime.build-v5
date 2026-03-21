

# Remove Scope Step from Project Wizard

Reduce the wizard from 4 steps to 3: **Basics → Team → Review**.

## Changes

### 1. `src/types/projectWizard.ts`
- Remove `scope` step from `WIZARD_STEPS` (keep basics, team, review)

### 2. `src/pages/CreateProjectNew.tsx`
- Remove `ScopeStep` import and `ScopeDetails` import
- Remove `updateScope` function
- Remove `scope: {}` from `initialData` (keep field in type for backward compat)
- Update `canProceed`: case 0 = basics, case 1 = team, case 2 = review
- Update `nextStep`: remove the `currentStep === 2` scope-saving block and the `generate-scope-description` call. Step 1 saves team, step 2 is review (no save needed before review)
- Update `renderStep`: case 0 = Basics, case 1 = Team, case 2 = Review (remove ScopeStep case)
- Remove `saveScope` function entirely

### 3. `src/components/project-wizard-new/index.ts`
- Remove `ScopeStep` export

### Files

| File | Change |
|------|--------|
| `src/types/projectWizard.ts` | Remove scope from WIZARD_STEPS |
| `src/pages/CreateProjectNew.tsx` | Remove scope step, saveScope, updateScope, renumber to 3 steps |
| `src/components/project-wizard-new/index.ts` | Remove ScopeStep export |

