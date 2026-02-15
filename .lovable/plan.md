

# Hide Supplier Estimate When TC Is Material Responsible

## Problem
When a GC creates a project and assigns material responsibility to the TC, the Supplier contract card still appears in the Contracts step. Since the TC is managing materials, the GC should not need to enter a Supplier estimate price -- that's the TC's concern.

## Change

### File: `src/components/project-wizard-new/ContractsStep.tsx`

**Filter out Supplier members when TC is material responsible:**

In the `downstreamMembers` memo (lines 71-83), when `creatorRole === 'General Contractor'`, check the current contracts state. If any TC contract has `materialResponsibility === 'TC'`, exclude Supplier members from the downstream list.

Logic:
1. Keep the current filter for TC and Supplier roles.
2. After filtering, if the member is a Supplier, check whether ALL TC contracts on this project have `materialResponsibility === 'TC'`.
3. If yes, exclude Supplier members -- the TC handles supplier relationships.
4. If any TC contract has `materialResponsibility === 'GC'` (or there are no TCs), keep Supplier members visible since the GC is managing materials directly.

This means the Supplier contract card will dynamically appear/disappear as the GC toggles material responsibility on TC contracts within the same step.

The `downstreamMembers` memo will add `contracts` as a dependency to react to material responsibility changes.

No other files need to change.
