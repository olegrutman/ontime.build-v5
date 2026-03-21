

# Simplify Project Wizard

## Changes

### 1. Remove Contracts step entirely
- **`src/types/projectWizard.ts`**: Remove `contracts` step from `WIZARD_STEPS` (keep only basics, team, scope, review = 4 steps). Remove `ProjectContract` interface and related exports.
- **`src/pages/CreateProjectNew.tsx`**: Remove `ContractsStep` import, `updateContracts`, `saveContracts`, and case 3/4 logic. Renumber steps: 0=basics, 1=team, 2=scope, 3=review. Remove `contracts` from `initialData` and `canProceed`. Remove contract saving from `nextStep`.
- **`src/components/project-wizard-new/index.ts`**: Remove `ContractsStep` export.

### 2. Remove "Number of Buildings" from Apartments/Hotels scope
- **`src/components/project-wizard-new/ScopeStep.tsx`**: In the `isMultiFamily` "Building Basics" card (line 181-235), remove the "Number of Buildings" input. Keep only Stories and Construction Type.

### 3. Add Units + Stories for Townhomes
- **`src/components/project-wizard-new/ScopeStep.tsx`**: In the Townhome/Duplex "Unit Details" card (line 238-266), ensure Townhomes show both "Number of Units" (already there) and "Stories per Unit" (add a select dropdown 1-4). Currently `storiesPerUnit` exists in the type but the input is missing from the Townhome section.

### 4. Simplify Review page — Basics + Team only, no description, no contracts
- **`src/components/project-wizard-new/ReviewStep.tsx`**: Remove the entire "Project Description" card (AI-generated, lines 209-244). Remove all scope detail cards (lines 327-555). Remove all contract cards (lines 557-679). Keep only: Project Basics card + Project Team card + "Ready to create" footer.

### Files changed

| File | Change |
|------|--------|
| `src/types/projectWizard.ts` | Remove contracts from WIZARD_STEPS |
| `src/pages/CreateProjectNew.tsx` | Remove contracts step, renumber steps |
| `src/components/project-wizard-new/ScopeStep.tsx` | Remove numBuildings, add storiesPerUnit for townhomes |
| `src/components/project-wizard-new/ReviewStep.tsx` | Strip to basics + team only |
| `src/components/project-wizard-new/index.ts` | Remove ContractsStep export |

