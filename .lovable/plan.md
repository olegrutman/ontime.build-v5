

# Prevent FC from Editing Contract with TC

## Problem

In `ContractHeroCard.tsx` (lines 148-174), when the viewer is a Field Crew, they see a pencil edit button on their contract with the Trade Contractor. Clicking it allows them to modify the contract sum and retainage — values that should only be set by the TC (the hiring party).

Similarly, in `ProjectContractsSection.tsx`, the `canEdit` prop is based on `canManageContracts` permission, which FC users may also have.

## Fix

### 1. `src/components/project/ContractHeroCard.tsx`
- Remove the edit pencil button from the FC hero section (lines 158-162). FC should see their contract value as **read-only**.

### 2. `src/components/project/ProjectContractsSection.tsx`
- Add a check so that FC users cannot edit contracts where they are the `from_org` (contractor). The `canEdit` prop passed to `ContractRow` should be `false` when the viewer is FC and the contract is a TC↔FC contract.

### 3. `src/hooks/useProjectFinancials.ts` (defensive backend check)
- In the `updateContract` function (line 466), add a guard: if `viewerRole === 'Field Crew'`, return `false` immediately. This prevents FC from updating any contract even if the UI guard is bypassed.

