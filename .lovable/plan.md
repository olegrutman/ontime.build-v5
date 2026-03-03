
# Fix: Material Budget Status Not Updating After Estimate Approval

## Problem
When the GC approves a supplier estimate in `ProjectEstimatesReview`, two things happen in the database:
1. The estimate status changes to `APPROVED`
2. The `material_estimate_total` on the contract is updated

However, the React Query caches for `['supplier-materials-overview', ...]` and `['project-financials', ...]` are **never invalidated** after these updates. The `MaterialsBudgetStatusCard` and financial cards continue showing stale data until the user manually refreshes the page.

## Changes

### `src/components/project/ProjectEstimatesReview.tsx`
- Import `useQueryClient` from `@tanstack/react-query`
- After `handleApprove` and `handleReject` succeed, invalidate:
  - `['supplier-materials-overview', projectId, ...]` — refreshes the Materials Budget Status card
  - `['project-financials', projectId]` — refreshes the financial dashboard (materialEstimate, approvedEstimateSum)
  - `['project-readiness', projectId]` — if readiness depends on estimate status

Concretely: call `queryClient.invalidateQueries({ queryKey: ['supplier-materials-overview'] })` and `queryClient.invalidateQueries({ queryKey: ['project-financials', projectId] })` after the successful DB update in both `handleApprove` and `handleReject`.

**1 file modified. No database changes.**
